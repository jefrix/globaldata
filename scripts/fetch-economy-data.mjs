#!/usr/bin/env node
/**
 * Fetch live macro / market prints into economy/data/latest.json and latest.js.
 * Never invents numbers. A failed series keeps its previous dated print, or is
 * marked unavailable when there is no previous print.
 *
 * The 2-year yield id is `twoy` / FRED series DGS2. This script does not read
 * Yahoo ^UST2Y. Yahoo ^TNX/^FVX/^TYX/^IRX are checked for percent versus yield×10.
 *
 * Provider order for DGS2 and the other FRED ids:
 *   1. FRED fredgraph.csv (no API key), then the FRED JSON API if FRED_API_KEY is set
 *   2. If that host does not answer: Treasury par yield curve for DGS2/DGS10/T10Y3M,
 *      BLS for UNRATE and CPIAUCSL, NY Fed EFFR monthly average for FEDFUNDS.
 *      Those fallbacks are labeled with the agency that actually answered.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  yieldUnitScale,
  nyDateFromUnix,
  buildSpread2s10s,
  alignSpreadExact,
  parseTreasuryYieldCsv,
  columnObs,
  blsRowsToObs,
  yoyFromLevelsExact,
  monthlyAverage,
  observationRow,
  shouldWriteSnapshot,
  retainMissing,
  mergeOrder,
} from "./economy-data-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "economy", "data");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, opts = {}, retries = 2) {
  const headers = {
    Accept: "application/json,text/plain,*/*",
    "User-Agent": UA,
    ...(opts.headers || {}),
  };
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...opts, headers });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastErr = new Error(`HTTP ${res.status} ${res.statusText} ${url} ${body.slice(0, 180)}`);
        if (res.status === 429 || res.status >= 500) {
          await sleep(800 * (i + 1));
          continue;
        }
        throw lastErr;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(600 * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchText(url, opts = {}, retries = 2) {
  const timeoutMs = opts.timeoutMs || 20000;
  const { timeoutMs: _timeout, ...rest } = opts;
  const headers = {
    Accept: "text/csv,text/plain,*/*",
    "User-Agent": UA,
    ...(rest.headers || {}),
  };
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, headers, signal: ac.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastErr = new Error("HTTP " + res.status + " " + res.statusText + " " + url + " " + body.slice(0, 180));
        if (res.status === 429 || res.status >= 500) {
          await sleep(800 * (i + 1));
          continue;
        }
        throw lastErr;
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < retries) await sleep(600 * (i + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

function compactHistory(closes, max = 48) {
  const nums = (closes || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length <= max) return nums.map((v) => round(v, 6));
  const step = (nums.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(round(nums[Math.round(i * step)], 6));
  }
  return out;
}

function round(n, d = 4) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pctChange(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  return round(((curr - prev) / Math.abs(prev)) * 100, 3);
}

function absChange(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  return round(curr - prev, 4);
}

function isoFromUnix(sec) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString();
}

function lastFinite(arr) {
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (typeof arr[i] === "number" && Number.isFinite(arr[i])) return arr[i];
  }
  return null;
}

function prevFinite(arr) {
  if (!arr) return null;
  let found = false;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (typeof arr[i] === "number" && Number.isFinite(arr[i])) {
      if (found) return arr[i];
      found = true;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Yahoo Finance
// ---------------------------------------------------------------------------

const YAHOO = [
  { id: "spx", symbol: "^GSPC", name: "S&P 500", unit: "pts", section: "equities", kind: "index" },
  { id: "nasdaq", symbol: "^IXIC", name: "Nasdaq Composite", unit: "pts", section: "equities", kind: "index" },
  { id: "dow", symbol: "^DJI", name: "Dow Jones", unit: "pts", section: "equities", kind: "index" },
  { id: "vix", symbol: "^VIX", name: "VIX", unit: "vol", section: "equities", kind: "vol" },
  { id: "dax", symbol: "^GDAXI", name: "DAX", unit: "pts", section: "equities", kind: "index" },
  { id: "eem", symbol: "EEM", name: "EM Equities (EEM)", unit: "USD", section: "equities", kind: "etf" },
  { id: "tnx", symbol: "^TNX", name: "US 10Y Yield", unit: "%", section: "rates", kind: "yield" },
  { id: "tyx", symbol: "^TYX", name: "US 30Y Yield", unit: "%", section: "rates", kind: "yield" },
  { id: "fvx", symbol: "^FVX", name: "US 5Y Yield", unit: "%", section: "rates", kind: "yield" },
  { id: "irx", symbol: "^IRX", name: "US 13W T-Bill", unit: "%", section: "rates", kind: "yield", headline: "policy" },
  { id: "tlt", symbol: "TLT", name: "Long Bond (TLT)", unit: "USD", section: "rates", kind: "etf" },
  { id: "hyg", symbol: "HYG", name: "High Yield (HYG)", unit: "USD", section: "rates", kind: "etf" },
  { id: "lqd", symbol: "LQD", name: "IG Credit (LQD)", unit: "USD", section: "rates", kind: "etf" },
  { id: "dxy", symbol: "DX-Y.NYB", name: "US Dollar Index", unit: "idx", section: "macro", kind: "index" },
  { id: "gold", symbol: "GC=F", name: "Gold", unit: "USD/oz", section: "metals", kind: "commodity" },
  { id: "silver", symbol: "SI=F", name: "Silver", unit: "USD/oz", section: "metals", kind: "commodity" },
  { id: "platinum", symbol: "PL=F", name: "Platinum", unit: "USD/oz", section: "metals", kind: "commodity" },
  { id: "copper", symbol: "HG=F", name: "Copper", unit: "USD/lb", section: "metals", kind: "commodity" },
  { id: "wti", symbol: "CL=F", name: "WTI Crude", unit: "USD/bbl", section: "energy", kind: "commodity" },
  { id: "brent", symbol: "BZ=F", name: "Brent Crude", unit: "USD/bbl", section: "energy", kind: "commodity" },
  { id: "natgas", symbol: "NG=F", name: "Natural Gas", unit: "USD/MMBtu", section: "energy", kind: "commodity" },
  { id: "btc", symbol: "BTC-USD", name: "Bitcoin", unit: "USD", section: "crypto", kind: "crypto" },
  { id: "eth", symbol: "ETH-USD", name: "Ethereum", unit: "USD", section: "crypto", kind: "crypto" },
];

async function fetchYahoo(item) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=6mo&includePrePost=false`;
  const json = await fetchJson(url);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`empty chart for ${item.symbol}`);
  const meta = result.meta || {};
  const closes = result.indicators?.quote?.[0]?.close || [];
  const timestamps = result.timestamp || [];

  let value = meta.regularMarketPrice;
  if (!Number.isFinite(value)) value = lastFinite(closes);
  if (!Number.isFinite(value)) throw new Error(`no price for ${item.symbol}`);

  let scale = 1;
  let unitNote = null;
  if (item.kind === "yield" || item.kind === "yield10x") {
    const sample = [];
    for (const v of closes) if (Number.isFinite(v)) sample.push(v);
    if (Number.isFinite(value)) sample.push(value);
    const decision = yieldUnitScale(sample);
    if (decision.scale == null) throw new Error(item.symbol + " yield units: " + decision.reason);
    scale = decision.scale;
    if (scale !== 1) unitNote = decision.reason;
  }
  const scaledCloses = closes.map((v) => (Number.isFinite(v) ? v * scale : null));
  const scaledValue = value * scale;

  // chartPreviousClose is the first point of the requested range, not yesterday.
  // Use the prior daily close from the 1d series; fall back to meta.previousClose.
  let prev = prevFinite(scaledCloses);
  if (Number.isFinite(meta.previousClose)) {
    const pclose = meta.previousClose * scale;
    if (!Number.isFinite(prev) || Math.abs(pclose - prev) / Math.max(Math.abs(prev), 1e-9) < 0.08) {
      prev = pclose;
    }
  }

  const lastTs = timestamps.length ? timestamps[timestamps.length - 1] : meta.regularMarketTime;
  const byDate = new Map();
  for (let i = 0; i < closes.length; i++) {
    if (!Number.isFinite(closes[i]) || !timestamps[i]) continue;
    const date = nyDateFromUnix(timestamps[i]);
    if (!date) continue;
    byDate.set(date, { date, value: closes[i] * scale, scale });
  }

  return {
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    section: item.section,
    source: "yahoo",
    headline: item.headline || null,
    value: round(scaledValue, item.kind === "yield10x" || item.kind === "yield" ? 3 : 2),
    unit: item.unit,
    prev: Number.isFinite(prev) ? round(prev, 4) : null,
    change: absChange(scaledValue, prev),
    changePct: pctChange(scaledValue, prev),
    asOf: isoFromUnix(lastTs) || isoFromUnix(meta.regularMarketTime),
    history: compactHistory(scaledCloses),
    available: true,
    fetchStatus: "fresh",
    retained: false,
    unitScale: item.kind === "yield" || item.kind === "yield10x" ? scale : null,
    asOfNote: unitNote,
    _obs: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---------------------------------------------------------------------------
// World Bank
// ---------------------------------------------------------------------------

const WB_SERIES = [
  { id: "gdp_usa", country: "USA", indicator: "NY.GDP.MKTP.KD.ZG", name: "US GDP Growth (WB annual)", unit: "% YoY", section: "world" },
  { id: "gdp_wld", country: "WLD", indicator: "NY.GDP.MKTP.KD.ZG", name: "World GDP Growth", unit: "% YoY", section: "world" },
  { id: "gdp_euu", country: "EUU", indicator: "NY.GDP.MKTP.KD.ZG", name: "EU GDP Growth", unit: "% YoY", section: "world" },
  { id: "gdp_chn", country: "CHN", indicator: "NY.GDP.MKTP.KD.ZG", name: "China GDP Growth", unit: "% YoY", section: "world" },
  { id: "gdp_jpn", country: "JPN", indicator: "NY.GDP.MKTP.KD.ZG", name: "Japan GDP Growth", unit: "% YoY", section: "world" },
  { id: "uem_usa", country: "USA", indicator: "SL.UEM.TOTL.ZS", name: "US Unemployment (WB annual)", unit: "%", section: "world" },
  { id: "uem_wld", country: "WLD", indicator: "SL.UEM.TOTL.ZS", name: "World Unemployment", unit: "%", section: "world" },
  { id: "uem_euu", country: "EUU", indicator: "SL.UEM.TOTL.ZS", name: "EU Unemployment", unit: "%", section: "world" },
  { id: "uem_chn", country: "CHN", indicator: "SL.UEM.TOTL.ZS", name: "China Unemployment", unit: "%", section: "world" },
  { id: "cpi_usa_wb", country: "USA", indicator: "FP.CPI.TOTL.ZG", name: "US Inflation (WB annual)", unit: "% YoY", section: "world" },
];

async function fetchWorldBank(item) {
  const url = `https://api.worldbank.org/v2/country/${item.country}/indicator/${item.indicator}?format=json&per_page=12&mrnev=8`;
  const json = await fetchJson(url);
  const rows = Array.isArray(json?.[1]) ? json[1] : [];
  const valid = rows.filter((r) => r && r.value != null && Number.isFinite(Number(r.value)));
  if (!valid.length) throw new Error(`no WB observations for ${item.id}`);
  valid.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = valid[0];
  const prev = valid[1];
  const hist = [...valid].reverse().map((r) => Number(r.value));
  const value = Number(latest.value);
  const prevVal = prev ? Number(prev.value) : null;
  return {
    id: item.id,
    name: item.name,
    symbol: `${item.country}:${item.indicator}`,
    section: item.section,
    source: "worldbank",
    value: round(value, 2),
    unit: item.unit,
    prev: Number.isFinite(prevVal) ? round(prevVal, 2) : null,
    change: absChange(value, prevVal),
    changePct: pctChange(value, prevVal),
    asOf: latest.date ? `${latest.date}-01-01` : null,
    asOfNote: latest.date ? `calendar year ${latest.date}` : null,
    history: compactHistory(hist, 12),
    available: true,
    headline: item.headline || null,
    frequency: "annual",
  };
}

// ---------------------------------------------------------------------------
// CoinGecko
// ---------------------------------------------------------------------------

async function fetchCoinGecko() {
  const out = [];
  const priceUrl =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
  const prices = await fetchJson(priceUrl);

  const map = [
    { id: "btc_cg", key: "bitcoin", name: "Bitcoin (CoinGecko)", section: "crypto" },
    { id: "eth_cg", key: "ethereum", name: "Ethereum (CoinGecko)", section: "crypto" },
  ];
  for (const m of map) {
    const row = prices?.[m.key];
    if (!row || !Number.isFinite(row.usd)) continue;
    const chg = Number.isFinite(row.usd_24h_change) ? round(row.usd_24h_change, 3) : null;
    out.push({
      id: m.id,
      name: m.name,
      symbol: m.key,
      section: m.section,
      source: "coingecko",
      value: round(row.usd, 2),
      unit: "USD",
      prev: null,
      change: null,
      changePct: chg,
      asOf: row.last_updated_at ? new Date(row.last_updated_at * 1000).toISOString() : null,
      history: [],
      available: true,
    });
  }

  try {
    const global = await fetchJson("https://api.coingecko.com/api/v3/global");
    const d = global?.data;
    if (d?.total_market_cap?.usd) {
      out.push({
        id: "crypto_mcap",
        name: "Crypto Market Cap",
        symbol: "CG:GLOBAL",
        section: "crypto",
        source: "coingecko",
        value: round(d.total_market_cap.usd, 0),
        unit: "USD",
        prev: null,
        change: null,
        changePct: Number.isFinite(d.market_cap_change_percentage_24h_usd)
          ? round(d.market_cap_change_percentage_24h_usd, 3)
          : null,
        asOf: d.updated_at ? new Date(d.updated_at * 1000).toISOString() : new Date().toISOString(),
        history: [],
        available: true,
      });
    }
    if (d?.market_cap_percentage?.btc != null) {
      out.push({
        id: "btc_dom",
        name: "BTC Dominance",
        symbol: "CG:BTC.D",
        section: "crypto",
        source: "coingecko",
        value: round(d.market_cap_percentage.btc, 2),
        unit: "%",
        prev: null,
        change: null,
        changePct: null,
        asOf: d.updated_at ? new Date(d.updated_at * 1000).toISOString() : new Date().toISOString(),
        history: [],
        available: true,
      });
    }
  } catch (err) {
    console.warn("CoinGecko global failed:", err.message);
  }

  try {
    const mkt = await fetchJson(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=true&price_change_percentage=24h"
    );
    if (Array.isArray(mkt)) {
      for (const row of mkt) {
        const id = row.id === "bitcoin" ? "btc_cg" : row.id === "ethereum" ? "eth_cg" : null;
        if (!id) continue;
        const target = out.find((s) => s.id === id);
        const spark = row.sparkline_in_7d?.price;
        if (target && Array.isArray(spark) && spark.length) {
          target.history = compactHistory(spark, 48);
        }
      }
    }
  } catch (err) {
    console.warn("CoinGecko sparkline failed:", err.message);
  }

  return out;
}

// ---------------------------------------------------------------------------
// FRED via public CSV (no API key). JSON API is a fallback if a key is set.
// ---------------------------------------------------------------------------

const FRED_SERIES = [
  { id: "unrate", series: "UNRATE", name: "US Unemployment U-3", unit: "%", section: "labor", headline: "unemp", freq: "monthly" },
  { id: "cpi", series: "CPIAUCSL", name: "US CPI", unit: "index", section: "macro", yoy: true, headline: "inflation", freq: "monthly" },
  { id: "fedfunds", series: "FEDFUNDS", name: "Fed Funds Rate", unit: "%", section: "rates", headline: "policy", freq: "monthly" },
  { id: "hy_oas", series: "BAMLH0A0HYM2", name: "HY OAS (ICE BofA)", unit: "%", section: "rates", freq: "daily" },
  { id: "nfci", series: "NFCI", name: "Chicago Fed NFCI", unit: "idx", section: "rates", freq: "weekly" },
  { id: "m2", series: "M2SL", name: "M2 Money Stock", unit: "bn USD", section: "money", freq: "monthly" },
  { id: "icsa", series: "ICSA", name: "Initial Jobless Claims", unit: "claims", section: "labor", freq: "weekly" },
  { id: "twoy", series: "DGS2", name: "US 2Y Yield", unit: "%", section: "rates", freq: "daily", kind: "yield" },
  { id: "dgs10", series: "DGS10", name: "US 10Y Yield (FRED)", unit: "%", section: "rates", freq: "daily", hidden: true },
  { id: "t10y2y", series: "T10Y2Y", name: "10Y minus 2Y (FRED)", unit: "pp", section: "rates", freq: "daily", hidden: true },
  { id: "spread_3m10s", series: "T10Y3M", name: "3m / 10Y Spread", unit: "pp", section: "rates", freq: "daily" },
  { id: "gdpc1", series: "GDPC1", name: "Real GDP (GDPC1)", unit: "bn Ch.$", section: "macro", freq: "quarterly", hidden: true },
  { id: "gdppot", series: "GDPPOT", name: "Real Potential GDP", unit: "bn Ch.$", section: "macro", freq: "quarterly", hidden: true },
  { id: "t5yifr", series: "T5YIFR", name: "5y5y Inflation Exp.", unit: "%", section: "macro", freq: "daily" },
  { id: "gdp_us_q", series: "A191RL1Q225SBEA", name: "US Real GDP Growth", unit: "% SAAR", section: "macro", headline: "gdp", freq: "quarterly" },
  { id: "base", series: "BOGMBASE", name: "Monetary Base", unit: "bn USD", section: "money", freq: "monthly" },
  { id: "m2v", series: "M2V", name: "M2 Velocity", unit: "idx", section: "money", freq: "quarterly", digits: 3 },
  { id: "totll", series: "TOTLL", name: "Bank Loans & Leases", unit: "bn USD", section: "money", freq: "weekly" },
  { id: "busloans", series: "BUSLOANS", name: "C&I Business Loans", unit: "bn USD", section: "money", freq: "monthly" },
  { id: "tdsp", series: "TDSP", name: "Household Debt Service", unit: "% of DI", section: "money", freq: "quarterly" },
  { id: "houst", series: "HOUST", name: "Housing Starts", unit: "thousands SAAR", section: "money", freq: "monthly" },
  { id: "indpro", series: "INDPRO", name: "Industrial Production", unit: "idx", section: "money", freq: "monthly" },
  { id: "ipcongd", series: "IPCONGD", name: "IP Consumer Goods", unit: "idx", section: "money", freq: "monthly" },
  { id: "ipmat", series: "IPMAT", name: "IP Materials", unit: "idx", section: "money", freq: "monthly" },
  { id: "nrou", series: "NROU", name: "Natural Rate of Unemployment (CBO)", unit: "%", section: "money", freq: "quarterly" },
  { id: "gdp_nom", series: "GDP", name: "Nominal GDP", unit: "bn USD", section: "money", freq: "quarterly", hidden: true },
  { id: "walcl", series: "WALCL", name: "Fed Total Assets", unit: "mn USD", section: "money", freq: "weekly", hidden: true },
  { id: "ppi", series: "PPIACO", name: "PPI All Commodities", unit: "index", section: "money", yoy: true, freq: "monthly" },
  { id: "tcmdo", series: "TCMDO", name: "Total Credit Market Debt", unit: "mn USD", section: "money", freq: "quarterly", hidden: true },
];

function parseFredCsv(text) {
  const lines = String(text || "").split(/\r?\n/);
  const out = [];
  let started = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!started) {
      const head = trimmed.toLowerCase();
      if (head.startsWith("observation_date") || head.startsWith("date,")) {
        started = true;
        continue;
      }
      continue;
    }
    const comma = trimmed.indexOf(",");
    if (comma < 0) continue;
    const date = trimmed.slice(0, comma).trim();
    const raw = trimmed.slice(comma + 1).trim();
    if (!raw || raw === ".") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (!/^\d{4}-\d{2}-\d{2}/.test(date)) continue;
    out.push({ date: date.slice(0, 10), value });
  }
  return out;
}

function clipToPresent(obs) {
  const today = new Date().toISOString().slice(0, 10);
  const past = (obs || []).filter((o) => o.date <= today);
  return past.length ? past : obs || [];
}

function sliceYears(obs, years = 8) {
  if (!obs.length) return obs;
  const last = obs[obs.length - 1].date;
  const cutoffYear = Number(last.slice(0, 4)) - years;
  const cutoff = String(cutoffYear).padStart(4, "0") + last.slice(4);
  return obs.filter((o) => o.date >= cutoff);
}

function yoyFromLevelsOldest(obs) {
  const byDate = new Map(obs.map((o) => [o.date, o.value]));
  const out = [];
  for (const o of obs) {
    const prevDate = String(Number(o.date.slice(0, 4)) - 1) + o.date.slice(4);
    const prev = byDate.get(prevDate);
    if (Number.isFinite(prev) && prev !== 0) {
      out.push({
        date: o.date,
        value: ((o.value - prev) / Math.abs(prev)) * 100,
      });
    }
  }
  return out;
}

function rowFromObs(item, used, unit, name) {
  const latest = used[used.length - 1];
  const prev = used.length > 1 ? used[used.length - 2] : null;
  const hist = used.map((o) => o.value);
  const whole = item.series === "ICSA" || item.series === "PAYEMS" || item.series === "HOUST";
  const digits = item.digits != null ? item.digits : (whole ? 0 : 2);
  return {
    id: item.id,
    name,
    symbol: item.series,
    section: item.section,
    source: "fred",
    value: round(latest.value, digits),
    unit,
    prev: prev ? round(prev.value, whole ? 0 : 4) : null,
    change: prev ? absChange(latest.value, prev.value) : null,
    changePct: prev ? pctChange(latest.value, prev.value) : null,
    asOf: latest.date,
    history: compactHistory(hist, 60),
    available: true,
    headline: item.headline || null,
    frequency: item.freq || "official",
    hidden: item.hidden || false,
  };
}

async function fetchFredCsv(item) {
  const url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + encodeURIComponent(item.series);
  const text = await fetchText(url);
  const rawAll = parseFredCsv(text);
  if (!rawAll.length) throw new Error("no FRED CSV obs for " + item.series);
  const raw = sliceYears(clipToPresent(rawAll), 8);
  let used = raw;
  let unit = item.unit;
  let name = item.name;
  if (item.yoy) {
    const yoy = yoyFromLevelsOldest(raw);
    if (!yoy.length) throw new Error("no YoY for " + item.series);
    used = yoy;
    unit = "% YoY";
    name = item.name + " YoY";
  }
  const row = rowFromObs(item, used, unit, name);
  return { row, raw, used };
}

async function fetchFredJson(item, key) {
  const url =
    "https://api.stlouisfed.org/fred/series/observations?series_id=" +
    item.series +
    "&api_key=" +
    key +
    "&file_type=json&sort_order=asc&observation_start=2016-01-01";
  const json = await fetchJson(url);
  const raw = (json?.observations || [])
    .map((o) => ({ date: o.date, value: o.value === "." ? null : Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
  if (!raw.length) throw new Error("no FRED JSON obs for " + item.series);
  let used = raw;
  let unit = item.unit;
  let name = item.name;
  if (item.yoy) {
    const yoy = yoyFromLevelsOldest(raw);
    if (!yoy.length) throw new Error("no YoY for " + item.series);
    used = yoy;
    unit = "% YoY";
    name = item.name + " YoY";
  }
  const row = rowFromObs(item, used, unit, name);
  return { row, raw, used };
}

function ym(date) {
  return String(date || "").slice(0, 7);
}

function alignSubtract(a, b) {
  const bmap = new Map();
  for (const o of b) bmap.set(ym(o.date), o);
  const out = [];
  for (const o of a) {
    const match = bmap.get(ym(o.date));
    if (!match) continue;
    out.push({
      date: o.date >= match.date ? o.date : match.date,
      value: o.value - match.value,
    });
  }
  return out;
}

function daysBetween(a, b) {
  const ta = Date.parse(a + "T00:00:00Z");
  const tb = Date.parse(b + "T00:00:00Z");
  return (ta - tb) / 86400000;
}

function yoyFromLevelsNearest(obs, windowDays = 18) {
  const out = [];
  if (!obs || !obs.length) return out;
  let j = 0;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    const target = String(Number(o.date.slice(0, 4)) - 1) + o.date.slice(4);
    while (j < i && daysBetween(target, obs[j].date) > windowDays) j++;
    let best = null;
    let bestAbs = Infinity;
    for (let k = j; k < i; k++) {
      const d = Math.abs(daysBetween(obs[k].date, target));
      if (d < bestAbs) {
        bestAbs = d;
        best = obs[k];
      }
      if (daysBetween(obs[k].date, target) > windowDays) break;
    }
    if (best && bestAbs <= windowDays && Number.isFinite(best.value) && best.value !== 0) {
      out.push({
        date: o.date,
        value: ((o.value - best.value) / Math.abs(best.value)) * 100,
      });
    }
  }
  return out;
}

function alignDivide(a, b) {
  const bmap = new Map();
  for (const o of b) bmap.set(ym(o.date), o);
  const out = [];
  for (const o of a) {
    const match = bmap.get(ym(o.date));
    if (!match || !Number.isFinite(match.value) || match.value === 0) continue;
    out.push({
      date: o.date >= match.date ? o.date : match.date,
      value: o.value / match.value,
    });
  }
  return out;
}

function percentileSorted(values, p) {
  const s = (values || []).filter((v) => typeof v === "number" && Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

function ensureYoyPack(fredPack, seriesId) {
  const key = seriesId + "_YOY";
  if (fredPack[key] && fredPack[key].length) return fredPack[key];
  const raw = fredPack[seriesId];
  if (!raw || !raw.length) return [];
  const yoy = yoyFromLevelsNearest(raw);
  fredPack[key] = yoy;
  return yoy;
}

function seriesFromObs(opts, obs) {
  if (!obs || !obs.length) return null;
  const latest = obs[obs.length - 1];
  const prev = obs.length > 1 ? obs[obs.length - 2] : null;
  const digits = opts.digits != null ? opts.digits : 2;
  const row = {
    id: opts.id,
    name: opts.name,
    symbol: opts.symbol,
    section: opts.section || "money",
    source: "derived",
    value: round(latest.value, digits),
    unit: opts.unit,
    prev: prev ? round(prev.value, 4) : null,
    change: prev ? absChange(latest.value, prev.value) : null,
    changePct: null,
    asOf: latest.date,
    asOfNote: opts.note,
    history: compactHistory(obs.map((o) => o.value), opts.hist || 60),
    available: true,
    constructed: true,
  };
  if (Number.isFinite(opts.p90)) row.p90 = round(opts.p90, 4);
  return row;
}

function monthKey(date) {
  return String(date || "").slice(0, 7);
}

function addMonths(ym, delta) {
  const [ys, ms] = ym.split("-");
  let y = Number(ys);
  let m = Number(ms) + delta;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return y + "-" + String(m).padStart(2, "0");
}

function computeSahm(unrateObs) {
  if (!unrateObs || unrateObs.length < 15) return [];
  const byYm = new Map(unrateObs.map((o) => [monthKey(o.date), o.value]));
  const keys = [];
  let cur = monthKey(unrateObs[0].date);
  const last = monthKey(unrateObs[unrateObs.length - 1].date);
  while (cur <= last) {
    keys.push(cur);
    cur = addMonths(cur, 1);
  }
  const avg3 = [];
  for (let i = 2; i < keys.length; i++) {
    const a = byYm.get(keys[i - 2]);
    const b = byYm.get(keys[i - 1]);
    const c = byYm.get(keys[i]);
    if (![a, b, c].every(Number.isFinite)) continue;
    avg3.push({ date: keys[i] + "-01", key: keys[i], value: (a + b + c) / 3 });
  }
  const sahm = [];
  for (const row of avg3) {
    const start = addMonths(row.key, -12);
    const window = avg3.filter((o) => o.key >= start && o.key < row.key);
    if (window.length < 8) continue;
    let min = Infinity;
    for (const o of window) min = Math.min(min, o.value);
    sahm.push({ date: row.date, value: row.value - min });
  }
  return sahm;
}

function pushDerived(extra, row) {
  extra.push(row);
}

function latestAsOf(...rows) {
  const dates = rows.map((r) => r && r.asOf).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Derived
// ---------------------------------------------------------------------------

function derive(series, fredPack = {}) {
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  const extra = [];

  // M2 YoY is first-class (Friedman k-percent). Built from M2SL levels so we
  // also keep the stock for the money multiplier. Populate pack for real_m2.
  ensureYoyPack(fredPack, "M2SL");

  const ten = byId.tnx;
  const curveMeta = fredPack._curveMeta || {
    tenSource: "fred",
    twoSource: "fred",
    symbol: "DGS10-DGS2",
    note: "FRED DGS10−DGS2, same date",
    method: "FRED DGS10 minus DGS2 on the exact observation date; both series are percent",
  };
  const spreadBuilt = buildSpread2s10s({
    ten: fredPack.DGS10 || [],
    two: fredPack.DGS2 || [],
    official: fredPack.T10Y2Y || [],
    yahooTnx: (ten && ten._obs) || [],
    tenSource: curveMeta.tenSource,
    twoSource: curveMeta.twoSource,
    symbol: curveMeta.symbol,
    note: curveMeta.note,
    method: curveMeta.method,
  });
  if (spreadBuilt.row && !byId.spread_2s10s) extra.push(spreadBuilt.row);

  const cpi = byId.cpi?.available ? byId.cpi : null;
  const fed = byId.fedfunds?.available ? byId.fedfunds : null;
  const irx = byId.irx?.available ? byId.irx : null;
  const policy = fed || irx;
  const un = byId.unrate?.available ? byId.unrate : null;
  const m2 = byId.m2_yoy?.available ? byId.m2_yoy : null;
  const gold = byId.gold?.available ? byId.gold : null;
  const copper = byId.copper?.available ? byId.copper : null;

  const policyObs = (fredPack.FEDFUNDS || []).map((o) => ({ date: String(o.date).slice(0, 7) + "-01", value: o.value }));
  const cpiObs = (fredPack.CPIAUCSL_YOY || []).map((o) => ({ date: String(o.date).slice(0, 7) + "-01", value: o.value }));
  const alignedPolicy = alignSpreadExact(policyObs, cpiObs);
  if (alignedPolicy.length) {
    const latest = alignedPolicy[alignedPolicy.length - 1];
    const prev = alignedPolicy.length > 1 ? alignedPolicy[alignedPolicy.length - 2] : null;
    const value = round(latest.value, 3);
    const prevValue = prev ? round(prev.value, 3) : null;
    pushDerived(extra, {
      id: "real_policy_rate",
      name: "Real Policy Rate",
      symbol: "FEDFUNDS minus CPI YoY",
      section: "theory",
      source: "derived",
      value,
      unit: "%",
      prev: prevValue,
      change: prevValue == null ? null : round(value - prevValue, 3),
      changePct: null,
      asOf: latest.date,
      asOfNote: "same-month FEDFUNDS minus CPI YoY",
      history: compactHistory(alignedPolicy.map((o) => o.value), 60),
      available: true,
      constructed: true,
    });
  }

  if (copper && gold && gold.value !== 0) {
    const value = round((copper.value / gold.value) * 1000, 3);
    const prev =
      Number.isFinite(copper.prev) && Number.isFinite(gold.prev) && gold.prev !== 0
        ? round((copper.prev / gold.prev) * 1000, 3)
        : null;
    pushDerived(extra, {
      id: "copper_gold",
      name: "Copper / Gold x1000",
      symbol: "HG/GC x1000",
      section: "theory",
      source: "derived",
      value,
      unit: "lb/oz x1000",
      prev,
      change: absChange(value, prev),
      changePct: pctChange(value, prev),
      asOf: latestAsOf(copper, gold),
      asOfNote: "copper USD/lb / gold USD/oz x1000",
      history: [],
      available: true,
      constructed: true,
    });
  }

  const gObs = fredPack.GDPC1 || [];
  const pObs = fredPack.GDPPOT || [];
  let outputGapLatest = null;
  if (gObs.length && pObs.length) {
    const pmap = new Map(pObs.map((o) => [o.date, o.value]));
    const gaps = [];
    for (const o of gObs) {
      const pot = pmap.get(o.date);
      if (Number.isFinite(pot) && pot !== 0) {
        gaps.push({ date: o.date, value: ((o.value - pot) / Math.abs(pot)) * 100 });
      }
    }
    if (gaps.length) {
      outputGapLatest = gaps[gaps.length - 1];
      const prev = gaps.length > 1 ? gaps[gaps.length - 2] : null;
      pushDerived(extra, {
        id: "output_gap",
        name: "Output Gap (GDPC1/GDPPOT)",
        symbol: "GDPC1/GDPPOT",
        section: "theory",
        source: "derived",
        value: round(outputGapLatest.value, 2),
        unit: "%",
        prev: prev ? round(prev.value, 4) : null,
        change: prev ? absChange(outputGapLatest.value, prev.value) : null,
        changePct: null,
        asOf: outputGapLatest.date,
        asOfNote: "(real GDP - potential) / potential",
        history: compactHistory(gaps.map((o) => o.value), 40),
        available: true,
        constructed: true,
      });
    }
  }

  if (cpi && outputGapLatest) {
    const pi = cpi.value;
    let y;
    let yNote;
    if (outputGapLatest) {
      y = outputGapLatest.value;
      yNote = "output gap GDPC1/GDPPOT";
    } else {
      y = 2 * (4.0 - un.value);
      yNote = "Okun proxy 2*(4.0-UNRATE)";
    }
    const iStar = 2 + pi + 0.5 * (pi - 2) + 0.5 * y;
    pushDerived(extra, {
      id: "taylor_implied",
      name: "Taylor 1993 implied i*",
      symbol: "constructed rule",
      section: "theory",
      source: "derived",
      value: round(iStar, 2),
      unit: "%",
      prev: null,
      change: null,
      changePct: null,
      asOf: outputGapLatest ? outputGapLatest.date : latestAsOf(cpi, un),
      asOfNote: "constructed 1993 rule; y=" + yNote,
      history: [],
      available: true,
      constructed: true,
    });
    if (policy) {
      const gap = policy.value - iStar;
      pushDerived(extra, {
        id: "taylor_gap",
        name: "Taylor 1993 gap (actual - i*)",
        symbol: "constructed rule",
        section: "theory",
        source: "derived",
        value: round(gap, 2),
        unit: "pp",
        prev: null,
        change: null,
        changePct: null,
        asOf: latestAsOf(policy, cpi, un),
        asOfNote: "negative = easier than the 1993 rule",
        history: [],
        available: true,
        constructed: true,
      });
    }
  }

  const unObs = fredPack.UNRATE || [];
  const sahmHist = computeSahm(unObs);
  if (sahmHist.length) {
    const latest = sahmHist[sahmHist.length - 1];
    const prev = sahmHist.length > 1 ? sahmHist[sahmHist.length - 2] : null;
    pushDerived(extra, {
      id: "sahm",
      name: "Sahm Rule",
      symbol: "constructed",
      section: "theory",
      source: "derived",
      value: round(latest.value, 3),
      unit: "pp",
      prev: prev ? round(prev.value, 4) : null,
      change: prev ? absChange(latest.value, prev.value) : null,
      changePct: null,
      asOf: latest.date,
      asOfNote: "3mma UNRATE minus prior-12m min of 3mma; trip >= 0.50",
      history: compactHistory(sahmHist.map((o) => o.value), 60),
      available: true,
      constructed: true,
      trip: latest.value >= 0.5,
    });
  }

  const cpiYoyObs = fredPack.CPIAUCSL_YOY || [];
  const m2YoyObs = fredPack.M2SL_YOY || [];
  if (m2YoyObs.length && cpiYoyObs.length) {
    const real = alignSubtract(m2YoyObs, cpiYoyObs);
    if (real.length) {
      const latest = real[real.length - 1];
      const prev = real.length > 1 ? real[real.length - 2] : null;
      pushDerived(extra, {
        id: "real_m2",
        name: "Real M2 Growth",
        symbol: "M2 YoY minus CPI YoY",
        section: "theory",
        source: "derived",
        value: round(latest.value, 2),
        unit: "% YoY",
        prev: prev ? round(prev.value, 4) : null,
        change: prev ? absChange(latest.value, prev.value) : null,
        changePct: null,
        asOf: latest.date,
        asOfNote: "M2 YoY minus CPI YoY, aligned by month",
        history: compactHistory(real.map((o) => o.value), 60),
        available: true,
        constructed: true,
      });
    }
  } else if (m2 && cpi) {
    const value = round(m2.value - cpi.value, 2);
    pushDerived(extra, {
      id: "real_m2",
      name: "Real M2 Growth",
      symbol: "M2 YoY minus CPI YoY",
      section: "theory",
      source: "derived",
      value,
      unit: "% YoY",
      prev: null,
      change: null,
      changePct: null,
      asOf: latestAsOf(m2, cpi),
      asOfNote: "M2 YoY minus CPI YoY (latest prints; months may differ)",
      history: [],
      available: true,
      constructed: true,
    });
  }

  // -------------------------------------------------------------------------
  // Money / credit — Mises, Menger, Rothbard, Friedman (constructed)
  // -------------------------------------------------------------------------
  const m2YoyForBoard = ensureYoyPack(fredPack, "M2SL");
  if (m2YoyForBoard.length) {
    const row = seriesFromObs({
      id: "m2_yoy",
      name: "M2 Growth",
      symbol: "M2SL YoY",
      unit: "% YoY",
      digits: 2,
      note: "constructed: year-over-year percent change of FRED M2SL (monthly, billions USD)",
    }, m2YoyForBoard);
    if (row) pushDerived(extra, row);
  }

  const baseYoy = ensureYoyPack(fredPack, "BOGMBASE");
  if (baseYoy.length) {
    const row = seriesFromObs({
      id: "base_yoy",
      name: "Monetary Base YoY",
      symbol: "BOGMBASE YoY",
      unit: "% YoY",
      digits: 2,
      note: "constructed: year-over-year percent change of FRED BOGMBASE (monthly, billions USD)",
    }, baseYoy);
    if (row) pushDerived(extra, row);
  }

  const loansYoy = ensureYoyPack(fredPack, "TOTLL");
  if (loansYoy.length) {
    const row = seriesFromObs({
      id: "loans_yoy",
      name: "Bank Loans YoY",
      symbol: "TOTLL YoY",
      unit: "% YoY",
      digits: 2,
      note: "constructed: year-over-year percent change of FRED TOTLL (weekly; nearest week ~1y prior)",
    }, loansYoy);
    if (row) pushDerived(extra, row);
  }

  const m2Obs = fredPack.M2SL || [];
  const baseObs = fredPack.BOGMBASE || [];
  if (m2Obs.length && baseObs.length) {
    const mult = alignDivide(m2Obs, baseObs);
    if (mult.length) {
      const vals = mult.map((o) => o.value);
      const p90 = percentileSorted(vals, 0.9);
      const row = seriesFromObs({
        id: "money_multiplier",
        name: "Money Multiplier",
        symbol: "M2SL/BOGMBASE",
        unit: "M2/base",
        digits: 2,
        p90,
        note: "constructed: M2SL / BOGMBASE, aligned by month (fiduciary-media / multiplier proxy)" +
          (Number.isFinite(p90) ? "; history p90=" + round(p90, 2) : ""),
      }, mult);
      if (row) pushDerived(extra, row);
    }
  }

  const gdpYoy = ensureYoyPack(fredPack, "GDP");
  if (m2YoyForBoard.length && gdpYoy.length) {
    const excess = alignSubtract(m2YoyForBoard, gdpYoy);
    if (excess.length) {
      const row = seriesFromObs({
        id: "excess_money",
        name: "Excess Money",
        symbol: "M2 YoY minus NGDP YoY",
        unit: "pp",
        digits: 2,
        note: "constructed: M2 YoY minus nominal GDP YoY, aligned by month (Friedman: money vs spending)",
      }, excess);
      if (row) pushDerived(extra, row);
    }
  }

  const ipmatObs = fredPack.IPMAT || [];
  const ipconObs = fredPack.IPCONGD || [];
  if (ipmatObs.length && ipconObs.length) {
    const ho = alignDivide(ipmatObs, ipconObs);
    if (ho.length) {
      const row = seriesFromObs({
        id: "higher_order_ratio",
        name: "Materials / Consumer IP",
        symbol: "IPMAT/IPCONGD",
        unit: "ratio",
        digits: 3,
        note: "constructed: IPMAT / IPCONGD, aligned by month (Mises/Hayek higher-order vs consumer goods)",
      }, ho);
      if (row) pushDerived(extra, row);
    }
  }

  const tcmdoObs = fredPack.TCMDO || [];
  const gdpObs = fredPack.GDP || [];
  if (tcmdoObs.length && gdpObs.length) {
    // TCMDO is millions of USD; GDP is billions of USD. Convert TCMDO → billions.
    const tcmdoBn = tcmdoObs.map((o) => ({ date: o.date, value: o.value / 1000 }));
    const cg = alignDivide(tcmdoBn, gdpObs);
    if (cg.length) {
      const row = seriesFromObs({
        id: "credit_gdp",
        name: "Credit / GDP",
        symbol: "TCMDO/GDP",
        unit: "× GDP",
        digits: 2,
        note: "constructed: (TCMDO millions USD / 1000) / GDP billions USD. TCMDO is $ millions, GDP is $ billions; ratio is a multiple of GDP. TCMDO is NSA, GDP is SAAR.",
      }, cg);
      if (row) pushDerived(extra, row);
    }
  }

  const silver = byId.silver?.available ? byId.silver : null;
  if (gold && silver && silver.value !== 0) {
    const value = gold.value / silver.value;
    const prev =
      Number.isFinite(gold.prev) && Number.isFinite(silver.prev) && silver.prev !== 0
        ? gold.prev / silver.prev
        : null;
    pushDerived(extra, {
      id: "gold_silver",
      name: "Gold / Silver",
      symbol: "GC=F / SI=F",
      section: "money",
      source: "derived",
      value: round(value, 2),
      unit: "oz Ag / oz Au",
      prev: prev != null ? round(prev, 4) : null,
      change: prev != null ? absChange(value, prev) : null,
      changePct: prev != null ? pctChange(value, prev) : null,
      asOf: latestAsOf(gold, silver),
      asOfNote: "constructed: Yahoo gold USD/oz divided by silver USD/oz (conventional gold/silver ratio = oz silver per oz gold)",
      history: [],
      available: true,
      constructed: true,
    });
  }

  const nrou = byId.nrou?.available ? byId.nrou : null;
  const unrateObs = fredPack.UNRATE || [];
  const nrouObs = fredPack.NROU || [];
  if (unrateObs.length && nrouObs.length) {
    const gaps = alignSubtract(unrateObs, nrouObs);
    if (gaps.length) {
      const row = seriesFromObs({
        id: "u_gap_nrou",
        name: "U minus NROU",
        symbol: "UNRATE-NROU",
        unit: "pp",
        digits: 2,
        note: "constructed: UNRATE minus NROU (CBO natural rate, clipped to present), aligned by month (Friedman natural-rate gap)",
      }, gaps);
      if (row) pushDerived(extra, row);
    }
  } else if (un && nrou) {
    const value = un.value - nrou.value;
    pushDerived(extra, {
      id: "u_gap_nrou",
      name: "U minus NROU",
      symbol: "UNRATE-NROU",
      section: "money",
      source: "derived",
      value: round(value, 2),
      unit: "pp",
      prev: null,
      change: null,
      changePct: null,
      asOf: latestAsOf(un, nrou),
      asOfNote: "constructed: latest UNRATE minus latest NROU (CBO, clipped to present); months may differ",
      history: [],
      available: true,
      constructed: true,
    });
  }

  const ppiYoyObs = fredPack.PPIACO_YOY || [];
  const cpiYoyForSpread = fredPack.CPIAUCSL_YOY || [];
  if (ppiYoyObs.length && cpiYoyForSpread.length) {
    const spread = alignSubtract(ppiYoyObs, cpiYoyForSpread);
    if (spread.length) {
      const row = seriesFromObs({
        id: "ppi_cpi_spread",
        name: "PPI minus CPI YoY",
        symbol: "PPIACO YoY - CPIAUCSL YoY",
        unit: "pp",
        digits: 2,
        note: "constructed: PPIACO YoY minus CPIAUCSL YoY, aligned by month",
      }, spread);
      if (row) pushDerived(extra, row);
    }
  }

  const walcl = byId.walcl?.available ? byId.walcl : null;
  if (walcl && Number.isFinite(walcl.value)) {
    const value = walcl.value / 1e6;
    const prev = Number.isFinite(walcl.prev) ? walcl.prev / 1e6 : null;
    const hist = (walcl.history || []).filter((v) => Number.isFinite(v)).map((v) => v / 1e6);
    pushDerived(extra, {
      id: "walcl_t",
      name: "Fed Balance Sheet",
      symbol: "WALCL / 1e6",
      section: "money",
      source: "derived",
      value: round(value, 3),
      unit: "$T",
      prev: prev != null ? round(prev, 4) : null,
      change: prev != null ? absChange(value, prev) : null,
      changePct: prev != null ? pctChange(value, prev) : null,
      asOf: walcl.asOf,
      asOfNote: "constructed: FRED WALCL (millions USD, Wednesday level) divided by 1,000,000 → trillions USD",
      history: compactHistory(hist, 60),
      available: true,
      constructed: true,
    });
  }

  return extra;
}

function loadPreviousSeries() {
  try {
    const json = JSON.parse(readFileSync(join(DATA_DIR, "latest.json"), "utf8"));
    return Array.isArray(json.series) ? json.series : [];
  } catch (err) {
    console.warn("No previous economy snapshot:", err.message);
    return [];
  }
}

function upsertSeries(series, row) {
  const idx = series.findIndex((s) => s.id === row.id);
  if (idx >= 0) series.splice(idx, 1);
  series.push(row);
}

function dropError(errors, id) {
  const idx = errors.findIndex((e) => e.id === id);
  if (idx >= 0) errors.splice(idx, 1);
}

async function fetchTreasuryRows() {
  const year = new Date().getUTCFullYear();
  const merged = new Map();
  const failures = [];
  for (let y = year - 8; y <= year; y++) {
    const url = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/"
      + y + "/all?type=daily_treasury_yield_curve&field_tdr_date_value=" + y + "&page&_format=csv";
    try {
      const text = await fetchText(url, { timeoutMs: 20000 }, 1);
      const parsed = parseTreasuryYieldCsv(text);
      if (!parsed.rows.length) throw new Error("no rows");
      for (const row of parsed.rows) merged.set(row.date, { ...(merged.get(row.date) || {}), ...row, date: row.date });
      console.log("  treasury " + y + " rows " + parsed.rows.length);
    } catch (err) {
      failures.push(y + ": " + err.message);
      console.warn("  treasury " + y + " failed: " + err.message);
    }
    await sleep(120);
  }
  const rows = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) throw new Error("Treasury yield curve unavailable (" + failures.join("; ") + ")");
  return rows;
}

async function fetchBlsMap() {
  const year = new Date().getUTCFullYear();
  const body = {
    seriesid: ["LNS14000000", "CUSR0000SA0", "WPU00000000"],
    startyear: String(year - 8),
    endyear: String(year),
  };
  const json = await fetchJson("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (json.status !== "REQUEST_SUCCEEDED") throw new Error("BLS " + (json.message || json.status));
  const map = {};
  for (const series of json.Results?.series || []) map[series.seriesID] = blsRowsToObs(series.data);
  return map;
}

async function fetchEffrMonthly() {
  const end = new Date().toISOString().slice(0, 10);
  let lastErr;
  for (const back of [8, 2]) {
    const start = (new Date().getUTCFullYear() - back) + "-01-01";
    try {
      const json = await fetchJson(
        "https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate=" + start + "&endDate=" + end,
        {},
        1
      );
      const daily = (json.refRates || [])
        .map((r) => ({ date: r.effectiveDate, value: Number(r.percentRate) }))
        .filter((o) => o.date && Number.isFinite(o.value));
      daily.sort((a, b) => a.date.localeCompare(b.date));
      const monthly = monthlyAverage(daily, 15);
      if (!monthly.length) throw new Error("no complete EFFR months");
      const sep = monthly.find((o) => o.date === "2026-09-01");
      if (sep && Math.abs(round(sep.value, 2) - 3.75) > 0.02) {
        throw new Error("September EFFR average " + sep.value + " does not reproduce FRED FEDFUNDS 3.75");
      }
      return monthly;
    } catch (err) {
      lastErr = err;
      console.warn("  EFFR window " + back + "y failed: " + err.message);
    }
  }
  throw lastErr || new Error("EFFR unavailable");
}

async function applyOfficialFallbacks(series, fredPack, errors, sourcesUsed) {
  const has = (id) => series.some((s) => s.id === id && s.available !== false);
  const needCurve = !(fredPack.DGS10 || []).length || !(fredPack.DGS2 || []).length;
  const needTwo = !has("twoy");
  const need3m = !has("spread_3m10s");
  if (needCurve || needTwo || need3m) {
    try {
      const rows = await fetchTreasuryRows();
      const ten = columnObs(rows, "10 yr");
      const two = columnObs(rows, "2 yr");
      const three = columnObs(rows, "3 mo");
      if (needCurve) {
        if (!ten.length || !two.length) throw new Error("Treasury file has no paired 10Y and 2Y");
        fredPack.DGS10 = ten;
        fredPack.DGS2 = two;
        fredPack._curveMeta = {
          tenSource: "treasury",
          twoSource: "treasury",
          symbol: "Treasury 10Y-2Y",
          note: "Treasury 10Y−2Y, same date",
          method: "U.S. Treasury daily par yield curve, exact date, both in percent. FRED DGS10/DGS2 CSV was not available for this pair. This is the H.15 constant-maturity curve FRED publishes as DGS10 and DGS2, not Yahoo ^UST2Y.",
        };
      }
      if (needTwo) {
        const row = observationRow({
          id: "twoy",
          name: "US 2Y Yield",
          symbol: "DGS2",
          section: "rates",
          source: "treasury",
          unit: "%",
          digits: 2,
          frequency: "daily",
          fredSeries: "DGS2",
          asOfNote: "Treasury par yield 2Y. FRED DGS2 file unreachable. Not Yahoo ^UST2Y.",
        }, two);
        if (!row) throw new Error("no Treasury 2Y observations");
        upsertSeries(series, row);
        dropError(errors, "twoy");
        sourcesUsed.add("treasury");
        console.log("  fallback twoy " + row.value + " (" + row.asOf + ")");
      }
      if (need3m && ten.length && three.length) {
        const built = buildSpread2s10s({
          ten,
          two: three,
          tenSource: "treasury",
          twoSource: "treasury",
          symbol: "T10Y3M",
          note: "Treasury 10Y−3M, same date",
          method: "U.S. Treasury par yield 10Y minus 3M on the exact date, both percent. FRED T10Y3M CSV was not available.",
        });
        if (built.row) {
          built.row.id = "spread_3m10s";
          built.row.name = "3m / 10Y Spread";
          upsertSeries(series, built.row);
          dropError(errors, "spread_3m10s");
          sourcesUsed.add("treasury");
          console.log("  fallback spread_3m10s " + built.row.value + " (" + built.row.asOf + ")");
        }
      }
    } catch (err) {
      console.warn("  Treasury fallback failed: " + err.message);
      errors.push({ id: "treasury_curve", source: "treasury", error: String(err.message) });
    }
  }

  const needBls = !has("unrate") || !has("cpi") || !has("ppi");
  if (needBls) {
    try {
      const bls = await fetchBlsMap();
      if (!has("unrate") && (bls.LNS14000000 || []).length) {
        fredPack.UNRATE = bls.LNS14000000;
        const row = observationRow({
          id: "unrate",
          name: "US Unemployment U-3",
          symbol: "UNRATE",
          section: "labor",
          source: "bls",
          unit: "%",
          digits: 1,
          headline: "unemp",
          frequency: "monthly",
          fredSeries: "UNRATE",
          asOfNote: "BLS LNS14000000, seasonally adjusted. FRED UNRATE file unreachable.",
        }, bls.LNS14000000);
        upsertSeries(series, row);
        dropError(errors, "unrate");
        sourcesUsed.add("bls");
        console.log("  fallback unrate " + row.value + " (" + row.asOf + ")");
      }
      if (!has("cpi") && (bls.CUSR0000SA0 || []).length) {
        const yoy = yoyFromLevelsExact(bls.CUSR0000SA0);
        fredPack.CPIAUCSL = bls.CUSR0000SA0;
        fredPack.CPIAUCSL_YOY = yoy;
        const row = observationRow({
          id: "cpi",
          name: "US CPI YoY",
          symbol: "CPIAUCSL",
          section: "macro",
          source: "bls",
          unit: "% YoY",
          digits: 2,
          headline: "inflation",
          frequency: "monthly",
          fredSeries: "CPIAUCSL",
          asOfNote: "YoY of BLS CUSR0000SA0 (SA CPI-U). FRED CPIAUCSL file unreachable.",
        }, yoy);
        if (row) {
          upsertSeries(series, row);
          dropError(errors, "cpi");
          sourcesUsed.add("bls");
          console.log("  fallback cpi " + row.value + " (" + row.asOf + ")");
        }
      }
      if (!has("ppi") && (bls.WPU00000000 || []).length) {
        const yoy = yoyFromLevelsExact(bls.WPU00000000);
        fredPack.PPIACO = bls.WPU00000000;
        fredPack.PPIACO_YOY = yoy;
        const row = observationRow({
          id: "ppi",
          name: "PPI All Commodities YoY",
          symbol: "PPIACO",
          section: "money",
          source: "bls",
          unit: "% YoY",
          digits: 2,
          frequency: "monthly",
          fredSeries: "PPIACO",
          asOfNote: "YoY of BLS WPU00000000. FRED PPIACO file unreachable.",
        }, yoy);
        if (row) {
          upsertSeries(series, row);
          dropError(errors, "ppi");
          sourcesUsed.add("bls");
          console.log("  fallback ppi " + row.value + " (" + row.asOf + ")");
        }
      }
    } catch (err) {
      console.warn("  BLS fallback failed: " + err.message);
      errors.push({ id: "bls", source: "bls", error: String(err.message) });
    }
  }

  if (!has("fedfunds")) {
    try {
      const monthly = await fetchEffrMonthly();
      fredPack.FEDFUNDS = monthly.map((o) => ({ date: o.date, value: o.value }));
      const row = observationRow({
        id: "fedfunds",
        name: "Fed Funds Rate",
        symbol: "FEDFUNDS",
        section: "rates",
        source: "nyfed",
        unit: "%",
        digits: 2,
        headline: "policy",
        frequency: "monthly",
        fredSeries: "FEDFUNDS",
        asOfNote: "Monthly average of NY Fed daily EFFR, incomplete month dropped. FRED FEDFUNDS file unreachable.",
      }, fredPack.FEDFUNDS);
      upsertSeries(series, row);
      dropError(errors, "fedfunds");
      sourcesUsed.add("nyfed");
      console.log("  fallback fedfunds " + row.value + " (" + row.asOf + ")");
    } catch (err) {
      console.warn("  NY Fed fallback failed: " + err.message);
      errors.push({ id: "fedfunds_effr", source: "nyfed", error: String(err.message) });
    }
  }
}

let fredCsvOk = null;
async function fredCsvWorks() {
  if (fredCsvOk != null) return fredCsvOk;
  try {
    const text = await fetchText(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2&cosd=2026-10-01",
      { timeoutMs: 12000 },
      0
    );
    fredCsvOk = parseFredCsv(text).length > 0;
  } catch (err) {
    fredCsvOk = false;
    console.warn("FRED CSV unreachable: " + err.message);
  }
  return fredCsvOk;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const series = [];
  const errors = [];
  const sourcesUsed = new Set();

  console.log("Fetching Yahoo Finance…");
  for (const item of YAHOO) {
    try {
      const row = await fetchYahoo(item);
      // skip alt 2Y if primary already landed
      if (item.id === "twoy_alt" && series.some((s) => s.id === "twoy" && s.available)) {
        console.log("  skip twoy_alt (primary ok)");
        continue;
      }
      if (item.id === "twoy_alt") { row.id = "twoy"; row.name = "US 2Y Yield (fut)"; }
      series.push(row);
      sourcesUsed.add("yahoo");
      console.log(`  ${row.id} ${row.value} ${row.unit}`);
    } catch (err) {
      console.warn(`  FAIL ${item.id} ${item.symbol}: ${err.message}`);
      errors.push({ id: item.id, source: "yahoo", error: String(err.message) });
    }
    await sleep(180);
  }

  console.log("Fetching World Bank…");
  for (const item of WB_SERIES) {
    try {
      const row = await fetchWorldBank(item);
      series.push(row);
      sourcesUsed.add("worldbank");
      console.log(`  ${row.id} ${row.value} ${row.unit} (${row.asOf})`);
    } catch (err) {
      console.warn(`  FAIL ${item.id}: ${err.message}`);
      errors.push({ id: item.id, source: "worldbank", error: String(err.message) });
    }
    await sleep(120);
  }

  console.log("Fetching CoinGecko…");
  try {
    const cg = await fetchCoinGecko();
    for (const row of cg) {
      series.push(row);
      console.log(`  ${row.id} ${row.value} ${row.unit}`);
    }
    if (cg.length) sourcesUsed.add("coingecko");
  } catch (err) {
    console.warn("  FAIL coingecko:", err.message);
    errors.push({ id: "coingecko", source: "coingecko", error: String(err.message) });
  }

  console.log("Fetching FRED…");
  const fredKey = process.env.FRED_API_KEY || "";
  const fredPack = {};
  const csvOk = await fredCsvWorks();
  for (const item of FRED_SERIES) {
    if (item.id === "twoy_alt") continue;
    try {
      let pack;
      if (csvOk) {
        try {
          pack = await fetchFredCsv(item);
        } catch (csvErr) {
          if (!fredKey) throw csvErr;
          console.warn("  CSV fail " + item.id + ", trying JSON API: " + csvErr.message);
          pack = await fetchFredJson(item, fredKey);
        }
      } else if (fredKey) {
        pack = await fetchFredJson(item, fredKey);
      } else {
        throw new Error("FRED CSV unreachable and FRED_API_KEY is not set");
      }
      const row = pack.row;
      row.fetchStatus = "fresh";
      row.retained = false;
      upsertSeries(series, row);
      sourcesUsed.add("fred");
      fredPack[item.series] = pack.raw;
      if (item.yoy) fredPack[item.series + "_YOY"] = pack.used;
      console.log("  " + row.id + " " + row.value + " " + row.unit + " (" + row.asOf + ")");
    } catch (err) {
      console.warn("  FAIL " + item.id + ": " + err.message);
      errors.push({ id: item.id, source: "fred", error: String(err.message) });
    }
    if (csvOk || fredKey) await sleep(280);
  }

  if ((fredPack.DGS10 || []).length && (fredPack.DGS2 || []).length) {
    fredPack._curveMeta = {
      tenSource: "fred",
      twoSource: "fred",
      symbol: "DGS10-DGS2",
      note: "FRED DGS10−DGS2, same date",
      method: "FRED DGS10 minus DGS2 on the exact observation date; both series are percent. Cross-checked with FRED T10Y2Y when that file is present.",
    };
  }

  console.log("Official fallbacks for series FRED did not return…");
  await applyOfficialFallbacks(series, fredPack, errors, sourcesUsed);

  const derived = derive(series, fredPack);
  for (const row of derived) {
    if (series.some((s) => s.id === row.id && s.retained)) continue;
    upsertSeries(series, row);
    sourcesUsed.add("derived");
    console.log("  derived " + row.id + " " + row.value + " " + row.unit + " (" + row.asOf + ")");
  }

  const previous = loadPreviousSeries();
  const cleaned = series
    .filter((s) => s && s.id && s.id !== "twoy_alt")
    .map((s) => {
      const copy = { ...s };
      delete copy._obs;
      return copy;
    });
  const merged = mergeOrder(previous, retainMissing(cleaned, previous, errors));
  if (!shouldWriteSnapshot(merged)) {
    console.error("Refusing to rewrite economy/data: fewer than 3 fresh market series and 3 fresh official series.");
    console.error("Previous snapshot left unchanged. Errors: " + errors.map((e) => e.id).join(", "));
    process.exit(1);
  }

  const fetchedAt = new Date().toISOString();
  const held = merged.filter((s) => s.retained).map((s) => s.id);
  const latest = {
    fetchedAt,
    timezone: "America/New_York",
    snapshot: {
      kind: "published-snapshot",
      providerPull: "scripts/fetch-economy-data.mjs",
      browserCheck: "The page cache-busts economy/data/latest.json when Economy is opened. It does not call Yahoo, FRED, Treasury, or BLS.",
    },
    series: merged,
  };
  const meta = {
    fetchedAt,
    sources: [...sourcesUsed],
    seriesCount: merged.length,
    held,
    errors,
    notes: [
      "Values are copied from public sources. None are invented.",
      "fetchedAt is when this snapshot was assembled. Each series asOf is that series' observation date, which can be older.",
      "retained true means the previous dated print was kept because this run did not get a new observation.",
      "twoy is the 2-year constant-maturity yield, symbol DGS2. Yahoo ^UST2Y is not used.",
      "Yahoo yield indexes are scaled to percent only when the sample median is in the legacy yield×10 range (above 20 and below 200). A median already between 0 and 20 is kept as percent.",
      "spread_2s10s is 10-year minus 2-year on the same calendar date after both yields are in percent. It is not the latest 10-year print minus an older 2-year print.",
      "FRED fredgraph.csv is tried first. Treasury, BLS, and NY Fed are used only for series FRED did not return, and those rows name the agency that answered.",
      "World Bank GDP, unemployment, and inflation are annual and lag the monthly BLS and BEA prints.",
      "NROU and GDPPOT are clipped to dates <= today when they come from FRED.",
      "The browser freshness check reads the committed JSON snapshot. It cannot publish a new snapshot. GitHub Actions (or a manual run of this script) does the provider pull.",
    ],
  };

  writeFileSync(join(DATA_DIR, "latest.json"), JSON.stringify(latest, null, 2) + "\n");
  writeFileSync(join(DATA_DIR, "latest.js"), "window.ECR_DATA = " + JSON.stringify(latest) + ";\n");
  writeFileSync(join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log("Wrote " + merged.length + " series → economy/data/latest.json (" + errors.length + " errors, " + held.length + " held)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
