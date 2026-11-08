/**
 * Pure helpers for the economy snapshot.
 * No network. No invented observations.
 */

export function round(n, d = 4) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function pctChange(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  return round(((curr - prev) / Math.abs(prev)) * 100, 3);
}

export function absChange(curr, prev) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  return round(curr - prev, 4);
}

export function compactHistory(closes, max = 48) {
  const nums = (closes || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (nums.length <= max) return nums.map((v) => round(v, 6));
  const step = (nums.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(round(nums[Math.round(i * step)], 6));
  }
  return out;
}

export function finiteNumbers(values) {
  return (values || []).filter((v) => typeof v === "number" && Number.isFinite(v));
}

/**
 * Yahoo's CBOE yield indexes are percent in the chart API (about 4.8, not 48).
 * A median above 20 is the legacy yield×10 quote. A median outside 0–200 is rejected.
 */
export function yieldUnitScale(values) {
  const nums = finiteNumbers(values).slice().sort((a, b) => a - b);
  if (!nums.length) return { scale: null, reason: "no yield observations" };
  const mid = nums[Math.floor((nums.length - 1) / 2)];
  if (mid > 20 && mid < 200) {
    return { scale: 0.1, reason: "median " + mid + " treated as yield×10; divided by 10 to percent" };
  }
  if (mid < 0 || mid >= 200) {
    return { scale: null, reason: "median " + mid + " is not a percent Treasury yield" };
  }
  return { scale: 1, reason: "median " + mid + " already in percent" };
}

export function nyDateFromUnix(sec) {
  if (!Number.isFinite(sec)) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date(sec * 1000));
}

export function parseFredCsv(text) {
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

export function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '"') quote = false;
      else cur += ch;
      continue;
    }
    if (ch === '"') {
      quote = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function isoFromUsDate(text) {
  const m = String(text || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = m[1].padStart(2, "0");
  const day = m[2].padStart(2, "0");
  return m[3] + "-" + month + "-" + day;
}

/**
 * U.S. Treasury daily par yield curve. Columns move across years; match by header.
 * Returns ascending observations for the requested tenor labels ("2 yr", "10 yr", "3 mo").
 */
export function parseTreasuryYieldCsv(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { columns: {}, rows: [] };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => h === "date");
  const wanted = ["1 mo", "2 mo", "3 mo", "6 mo", "1 yr", "2 yr", "3 yr", "5 yr", "7 yr", "10 yr", "20 yr", "30 yr"];
  const col = {};
  for (const name of wanted) {
    const idx = header.indexOf(name);
    if (idx >= 0) col[name] = idx;
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = isoFromUsDate(cells[dateIdx]);
    if (!date) continue;
    const point = { date };
    let any = false;
    for (const name of Object.keys(col)) {
      const raw = cells[col[name]];
      if (raw == null || raw === "" || raw === "N/A") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      point[name] = value;
      any = true;
    }
    if (any) rows.push(point);
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { columns: col, rows };
}

export function columnObs(rows, name) {
  return (rows || [])
    .filter((r) => Number.isFinite(r[name]))
    .map((r) => ({ date: r.date, value: r[name] }));
}

/**
 * Exact calendar-date subtraction. Different days in the same month do not match.
 * Both inputs must already be in the same units (percent).
 */
export function alignSpreadExact(tenObs, twoObs) {
  const two = new Map();
  for (const o of twoObs || []) {
    if (!o || !o.date || !Number.isFinite(o.value)) continue;
    two.set(String(o.date).slice(0, 10), o.value);
  }
  const out = [];
  for (const o of tenObs || []) {
    if (!o || !o.date || !Number.isFinite(o.value)) continue;
    const date = String(o.date).slice(0, 10);
    if (!two.has(date)) continue;
    const twoValue = two.get(date);
    out.push({ date, value: o.value - twoValue, ten: o.value, two: twoValue });
  }
  return out;
}

export function crossCheckSpread(calcObs, officialObs, tolerance = 0.02) {
  const official = new Map();
  for (const o of officialObs || []) {
    if (o && o.date && Number.isFinite(o.value)) official.set(String(o.date).slice(0, 10), o.value);
  }
  let compared = 0;
  let mismatches = 0;
  let maxAbs = 0;
  let latest = null;
  for (const o of calcObs || []) {
    if (!official.has(o.date)) continue;
    const v = official.get(o.date);
    const gap = Math.abs(o.value - v);
    compared += 1;
    if (gap > maxAbs) maxAbs = gap;
    if (gap > tolerance) mismatches += 1;
    latest = { date: o.date, calculated: o.value, official: v, gap };
  }
  return {
    compared,
    mismatches,
    maxAbs: round(maxAbs, 4),
    tolerance,
    latest,
  };
}

export function buildSpread2s10s(input) {
  const ten = input.ten || [];
  const two = input.two || [];
  const aligned = alignSpreadExact(ten, two);
  const official = (input.official || []).filter((o) => o && o.date && Number.isFinite(o.value));
  const check = crossCheckSpread(aligned, official, input.tolerance || 0.02);
  if (!aligned.length && !official.length) {
    return { row: null, aligned, check, reason: "no common 10Y and 2Y dates" };
  }
  let used = aligned;
  let method = input.method || "exact-date 10Y minus 2Y, both percent";
  let note = input.note || "same-date 10Y−2Y, percent";
  if (aligned.length && official.length && check.compared >= 5 && check.maxAbs > 0.05) {
    used = official.map((o) => {
      const pair = aligned.find((a) => a.date === o.date);
      return { date: o.date, value: o.value, ten: pair ? pair.ten : null, two: pair ? pair.two : null };
    });
    method = "FRED T10Y2Y; aligned 10Y−2Y diverged by " + check.maxAbs + " pp";
    note = "FRED T10Y2Y official spread";
  } else if (!aligned.length && official.length) {
    used = official.map((o) => ({ date: o.date, value: o.value, ten: null, two: null }));
    method = "FRED T10Y2Y (10Y and 2Y levels were not both available)";
    note = "FRED T10Y2Y official spread";
  }
  if (!used.length) return { row: null, aligned, check, reason: "empty spread" };
  const latest = used[used.length - 1];
  const prev = used.length > 1 ? used[used.length - 2] : null;
  const value = round(latest.value, 3);
  const prevValue = prev ? round(prev.value, 3) : null;
  const yahoo = (input.yahooTnx || []).find((o) => o.date === latest.date) || null;
  const row = {
    id: "spread_2s10s",
    name: "2s10s Spread",
    symbol: input.symbol || "10Y-2Y",
    section: "rates",
    source: "derived",
    value,
    unit: "pp",
    prev: prevValue,
    change: prevValue == null ? null : round(value - prevValue, 3),
    changePct: null,
    asOf: latest.date,
    asOfNote: note,
    history: compactHistory(used.map((o) => o.value), 60),
    available: true,
    constructed: true,
    audit: {
      method,
      date: latest.date,
      ten: latest.ten == null ? null : round(latest.ten, 4),
      two: latest.two == null ? null : round(latest.two, 4),
      tenSource: input.tenSource || null,
      twoSource: input.twoSource || null,
      units: "percent minus percent = percentage points",
      yahooTnx: yahoo
        ? { date: yahoo.date, value: round(yahoo.value, 4), scale: yahoo.scale == null ? null : yahoo.scale }
        : null,
      crossCheck: check,
    },
  };
  return { row, aligned, check };
}

export function blsRowsToObs(data) {
  const out = [];
  for (const row of data || []) {
    if (!row || typeof row.period !== "string" || !row.period.startsWith("M") || row.period === "M13") continue;
    const value = Number(row.value);
    if (!Number.isFinite(value)) continue;
    const month = row.period.slice(1);
    if (!/^\d{2}$/.test(month) || !/^\d{4}$/.test(String(row.year))) continue;
    out.push({ date: row.year + "-" + month + "-01", value });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function yoyFromLevelsExact(obs) {
  const byDate = new Map((obs || []).map((o) => [o.date, o.value]));
  const out = [];
  for (const o of obs || []) {
    const prevDate = String(Number(o.date.slice(0, 4)) - 1) + o.date.slice(4);
    const prev = byDate.get(prevDate);
    if (Number.isFinite(prev) && prev !== 0) {
      out.push({ date: o.date, value: ((o.value - prev) / Math.abs(prev)) * 100 });
    }
  }
  return out;
}

export function monthlyAverage(dailyObs, minDays = 15) {
  const groups = new Map();
  for (const o of dailyObs || []) {
    if (!o || !o.date || !Number.isFinite(o.value)) continue;
    const key = String(o.date).slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o.value);
  }
  const out = [];
  for (const [key, vals] of groups) {
    const value = vals.reduce((sum, n) => sum + n, 0) / vals.length;
    out.push({ date: key + "-01", value, n: vals.length });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  if (out.length && out[out.length - 1].n < minDays) out.pop();
  return out;
}

export function observationRow(spec, obs) {
  if (!obs || !obs.length) return null;
  const latest = obs[obs.length - 1];
  const prev = obs.length > 1 ? obs[obs.length - 2] : null;
  const digits = spec.digits != null ? spec.digits : 2;
  const prevDigits = spec.prevDigits != null ? spec.prevDigits : 4;
  return {
    id: spec.id,
    name: spec.name,
    symbol: spec.symbol,
    section: spec.section,
    source: spec.source,
    value: round(latest.value, digits),
    unit: spec.unit,
    prev: prev ? round(prev.value, prevDigits) : null,
    change: prev ? absChange(latest.value, prev.value) : null,
    changePct: prev ? pctChange(latest.value, prev.value) : null,
    asOf: latest.date,
    asOfNote: spec.asOfNote || null,
    history: compactHistory(obs.map((o) => o.value), spec.hist || 60),
    available: true,
    headline: spec.headline || null,
    frequency: spec.frequency || null,
    hidden: !!spec.hidden,
    fredSeries: spec.fredSeries || null,
    fetchStatus: "fresh",
    retained: false,
  };
}

export function shouldWriteSnapshot(series) {
  const fresh = (series || []).filter((s) => s && !s.retained && s.available !== false && Number.isFinite(s.value));
  const markets = fresh.filter((s) => s.source === "yahoo" || s.source === "coingecko").length;
  const official = fresh.filter((s) => ["fred", "bls", "treasury", "nyfed", "worldbank"].includes(s.source)).length;
  return markets >= 3 && official >= 3;
}

export function retainMissing(series, previousSeries, errors) {
  const out = (series || []).slice();
  const seen = new Set(out.map((s) => s.id));
  const prev = new Map((previousSeries || []).filter((s) => s && s.id).map((s) => [s.id, s]));
  const hold = (id, error, source) => {
    if (seen.has(id)) return;
    const old = prev.get(id);
    if (old && old.available !== false && Number.isFinite(Number(old.value))) {
      out.push({
        ...old,
        retained: true,
        fetchStatus: "last-known",
        fetchError: String(error || "not refreshed").slice(0, 300),
      });
    } else {
      out.push({
        id,
        name: (old && old.name) || id,
        symbol: (old && old.symbol) || null,
        section: (old && old.section) || "macro",
        source: source || (old && old.source) || "unknown",
        available: false,
        value: null,
        unit: (old && old.unit) || null,
        prev: null,
        change: null,
        changePct: null,
        asOf: null,
        history: [],
        fetchStatus: "unavailable",
        fetchError: String(error || "unavailable").slice(0, 300),
        retained: false,
      });
    }
    seen.add(id);
  };
  for (const err of errors || []) {
    if (!err || !err.id || seen.has(err.id)) continue;
    hold(err.id, err.error, err.source);
  }
  for (const [id, old] of prev) {
    if (seen.has(id)) continue;
    if (Number.isFinite(Number(old.value))) hold(id, "not refreshed this run", old.source);
  }
  return out;
}

export function mergeOrder(previousSeries, nextSeries) {
  const nextById = new Map();
  for (const s of nextSeries || []) {
    if (s && s.id && !nextById.has(s.id)) nextById.set(s.id, s);
  }
  const out = [];
  const used = new Set();
  for (const old of previousSeries || []) {
    if (!old || !old.id || !nextById.has(old.id) || used.has(old.id)) continue;
    out.push(nextById.get(old.id));
    used.add(old.id);
  }
  for (const s of nextSeries || []) {
    if (!s || !s.id || used.has(s.id)) continue;
    out.push(s);
    used.add(s.id);
  }
  return out;
}

export function parseLatestJs(text) {
  const raw = String(text || "").trim();
  const prefix = "window.ECR_DATA = ";
  if (!raw.startsWith(prefix) || !raw.endsWith(";")) return null;
  return JSON.parse(raw.slice(prefix.length, -1));
}

export function snapshotTime(data) {
  const t = Date.parse(data && data.fetchedAt || "");
  return Number.isFinite(t) ? t : 0;
}

export function decideSnapshot(currentData, incoming) {
  if (!incoming || !Array.isArray(incoming.series) || incoming.series.length === 0) {
    return { apply: false, reason: "empty" };
  }
  if (!currentData || !Array.isArray(currentData.series) || currentData.series.length === 0) {
    return { apply: true, reason: "initial", incomingFetchedAt: incoming.fetchedAt || null };
  }
  const next = snapshotTime(incoming);
  const prev = snapshotTime(currentData);
  if (!(next > prev)) {
    return { apply: false, reason: "not-newer", incomingFetchedAt: incoming.fetchedAt || null };
  }
  return { apply: true, reason: "newer", incomingFetchedAt: incoming.fetchedAt || null };
}

export function describeFreshness(data, nowMs) {
  const fetched = data && data.fetchedAt;
  const parsed = Date.parse(fetched || "");
  const ageH = Number.isFinite(parsed) ? (nowMs - parsed) / 36e5 : Infinity;
  const state = (data && data.clientCheck && data.clientCheck.state) || "embedded";
  let badge = "PUBLISHED SNAPSHOT";
  let klass = "is-live";
  if (state === "offline") {
    badge = "OFFLINE";
    klass = "is-dead";
  } else if (state === "timeout") {
    badge = "CHECK TIMEOUT";
    klass = "is-stale";
  } else if (state === "checking") {
    badge = "CHECKING";
    klass = "is-stale";
  } else if (!Number.isFinite(ageH) || ageH >= 36) {
    badge = "STALE SNAPSHOT";
    klass = "is-dead";
  }
  const held = ((data && data.series) || []).filter((s) => s && s.retained).length;
  const lines = {
    updated: "NEWER SNAPSHOT APPLIED",
    current: "SNAPSHOT CURRENT",
    offline: "KEPT EMBEDDED COPY",
    timeout: "CHECK TIMED OUT",
    checking: "CHECKING PUBLISHED JSON",
    embedded: "PUBLISHED JSON",
  };
  const line = lines[state] || "PUBLISHED JSON";
  return {
    badge,
    klass,
    line: held ? line + " · " + held + " LAST-KNOWN" : line,
    ageH,
    held,
  };
}

export function addMonths(ym, delta) {
  const [ys, ms] = ym.split("-");
  let y = Number(ys);
  let m = Number(ms) + delta;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return y + "-" + String(m).padStart(2, "0");
}

export function computeSahm(unrateObs) {
  if (!unrateObs || unrateObs.length < 15) return [];
  const byYm = new Map(unrateObs.map((o) => [o.date.slice(0, 7), o.value]));
  const keys = [];
  let cur = unrateObs[0].date.slice(0, 7);
  const last = unrateObs[unrateObs.length - 1].date.slice(0, 7);
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

export function validateSnapshot(data) {
  const problems = [];
  if (!data || !Array.isArray(data.series)) {
    return ["snapshot has no series array"];
  }
  const fetched = Date.parse(data.fetchedAt || "");
  if (!Number.isFinite(fetched)) problems.push("fetchedAt is not a timestamp");
  else if (fetched > Date.now() + 5 * 60 * 1000) problems.push("fetchedAt is in the future");
  const ids = [];
  for (const s of data.series) {
    if (!s || !s.id) {
      problems.push("series row missing id");
      continue;
    }
    ids.push(s.id);
    if (s.symbol === "^UST2Y" || s.id === "twoy_alt") problems.push(s.id + " uses defunct ^UST2Y path");
    if (s.available === false) {
      if (s.value != null) problems.push(s.id + " unavailable but has a value");
      continue;
    }
    if (!Number.isFinite(s.value)) problems.push(s.id + " value is not finite");
    if (s.asOf == null || s.asOf === "") problems.push(s.id + " missing observation date");
    if (Array.isArray(s.history)) {
      for (const n of s.history) {
        if (typeof n !== "number" || !Number.isFinite(n)) {
          problems.push(s.id + " history contains a non-finite value");
          break;
        }
      }
    } else {
      problems.push(s.id + " history is not an array");
    }
    if (s.retained && s.fetchStatus !== "last-known") problems.push(s.id + " retained without last-known status");
  }
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) problems.push("duplicate ids: " + [...new Set(dup)].join(","));
  const byId = Object.fromEntries(data.series.filter((s) => s && s.id).map((s) => [s.id, s]));
  const two = byId.twoy;
  if (!two) problems.push("missing twoy");
  else {
    if (two.symbol !== "DGS2") problems.push("twoy symbol is " + two.symbol + ", expected DGS2");
    if (two.source === "yahoo") problems.push("twoy must not come from Yahoo");
    if (two.available !== false && !(two.value > 0 && two.value < 20)) problems.push("twoy outside percent range");
  }
  const spread = byId.spread_2s10s;
  if (!spread) problems.push("missing spread_2s10s");
  else if (spread.available !== false) {
    if (spread.unit !== "pp") problems.push("spread unit is not pp");
    if (!Array.isArray(spread.history) || spread.history.length < 2) problems.push("spread history is empty");
    const last = spread.history[spread.history.length - 1];
    if (Number.isFinite(last) && Math.abs(last - spread.value) > 0.02) {
      problems.push("spread history does not end at the latest value");
    }
    const audit = spread.audit;
    if (!audit || !audit.date) problems.push("spread missing alignment audit");
    else {
      if (audit.date !== String(spread.asOf).slice(0, 10)) problems.push("spread asOf does not match aligned date");
      if (Number.isFinite(audit.ten) && Number.isFinite(audit.two)) {
        const gap = audit.ten - audit.two;
        if (Math.abs(gap - spread.value) > 0.002) problems.push("spread does not equal aligned 10Y minus 2Y");
        if (!(audit.ten > 0 && audit.ten < 20 && audit.two > 0 && audit.two < 20)) {
          problems.push("aligned yields are not in percent");
        }
      }
    }
  }
  const tnx = byId.tnx;
  if (tnx && tnx.available !== false && !(tnx.value > 0 && tnx.value < 20)) {
    problems.push("tnx is not in percent");
  }
  for (const id of ["spx", "nasdaq", "gold", "wti", "btc", "unrate", "cpi", "fedfunds"]) {
    const s = byId[id];
    if (!s || s.available === false || !Number.isFinite(s.value)) problems.push("missing fresh-or-known " + id);
  }
  return problems;
}
