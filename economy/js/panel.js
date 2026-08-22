/**
 * Paint the economic control room from data/latest.json.
 * Vanilla JS. No bundler, no chart library.
 */
(function () {
  "use strict";

  const TZ = "America/New_York";
  const SKIP_TILE_IDS = new Set(["btc_cg", "eth_cg", "twoy_alt", "gdpc1", "gdppot"]);

  const SECTIONS = [
    { id: "money", label: "MONEY / CREDIT / RULES" },
    { id: "macro", label: "MACRO" },
    { id: "labor", label: "LABOR & INCOME" },
    { id: "rates", label: "RATES & CREDIT" },
    { id: "equities", label: "EQUITIES" },
    { id: "metals", label: "METALS" },
    { id: "energy", label: "ENERGY" },
    { id: "crypto", label: "CRYPTO" },
    { id: "world", label: "WORLD" },
  ];

  const TICKER_IDS = ["spx", "nasdaq", "dow", "vix", "tnx", "dxy", "gold", "wti", "btc", "eth", "dax", "spread_2s10s", "spread_3m10s", "hy_oas"];

  const HEADLINES = [
    {
      key: "gdp",
      ids: ["gdp_us_q", "gdp_usa"],
      label: "GDP GROWTH",
      min: -4,
      max: 8,
      major: 2,
      minor: 1,
      digits: 2,
      bands: [
        { from: -4, to: 0, color: "#e23b2f" },
        { from: 0, to: 2, color: "#ffe14a" },
        { from: 2, to: 8, color: "#3dcc6f" },
      ],
    },
    {
      key: "unemp",
      ids: ["unrate", "uem_usa"],
      label: "UNEMPLOYMENT",
      min: 2,
      max: 10,
      major: 2,
      minor: 0.5,
      digits: 1,
      bands: [
        { from: 2, to: 4.5, color: "#3dcc6f" },
        { from: 4.5, to: 6, color: "#ffe14a" },
        { from: 6, to: 10, color: "#e23b2f" },
      ],
    },
    {
      key: "inflation",
      ids: ["cpi", "pce", "cpi_usa_wb"],
      label: "INFLATION",
      min: 0,
      max: 8,
      major: 2,
      minor: 0.5,
      digits: 2,
      bands: [
        { from: 0, to: 2.5, color: "#3dcc6f" },
        { from: 2.5, to: 4, color: "#ffe14a" },
        { from: 4, to: 8, color: "#e23b2f" },
      ],
    },
    {
      key: "policy",
      ids: ["fedfunds", "irx"],
      label: "POLICY RATE",
      min: 0,
      max: 8,
      major: 2,
      minor: 0.5,
      digits: 2,
      bands: [
        { from: 0, to: 2, color: "#3dcc6f" },
        { from: 2, to: 5.25, color: "#ffe14a" },
        { from: 5.25, to: 8, color: "#e23b2f" },
      ],
    },
  ];

  const PRESSURE = [
    {
      key: "real_policy",
      ids: ["real_policy_rate"],
      label: "REAL POLICY RATE",
      min: -2,
      max: 6,
      major: 2,
      minor: 1,
      digits: 2,
      bands: [
        { from: -2, to: 0, color: "#e23b2f" },
        { from: 0, to: 1, color: "#ffe14a" },
        { from: 1, to: 3, color: "#3dcc6f" },
        { from: 3, to: 4.5, color: "#ffe14a" },
        { from: 4.5, to: 6, color: "#e23b2f" },
      ],
    },
    {
      key: "hy_oas",
      ids: ["hy_oas"],
      label: "HY CREDIT OAS",
      min: 2,
      max: 12,
      major: 2,
      minor: 1,
      digits: 2,
      bands: [
        { from: 2, to: 4, color: "#3dcc6f" },
        { from: 4, to: 6, color: "#ffe14a" },
        { from: 6, to: 12, color: "#e23b2f" },
      ],
    },
    {
      key: "nfci",
      ids: ["nfci"],
      label: "FIN CONDITIONS",
      min: -1,
      max: 1,
      major: 0.5,
      minor: 0.25,
      digits: 2,
      bands: [
        { from: -1, to: 0, color: "#3dcc6f" },
        { from: 0, to: 0.5, color: "#ffe14a" },
        { from: 0.5, to: 1, color: "#e23b2f" },
      ],
    },
    {
      key: "real_m2",
      ids: ["real_m2"],
      label: "REAL M2 GROWTH",
      min: -8,
      max: 16,
      major: 4,
      minor: 2,
      digits: 1,
      bands: [
        { from: -8, to: 0, color: "#e23b2f" },
        { from: 0, to: 2, color: "#ffe14a" },
        { from: 2, to: 8, color: "#3dcc6f" },
        { from: 8, to: 12, color: "#ffe14a" },
        { from: 12, to: 16, color: "#e23b2f" },
      ],
    },
  ];

  const LIGHTS = [
    { seriesId: "sahm", label: "SAHM", trip: (v) => v >= 0.5, digits: 3 },
    { seriesId: "spread_3m10s", label: "3m10s INVERT", trip: (v) => v < 0, digits: 2, signed: true },
    { seriesId: "icsa", label: "CLAIMS", trip: (v) => v >= 280000, claims: true },
    { seriesId: "taylor_gap", label: "TAYLOR GAP", trip: (v) => Math.abs(v) >= 1.5, digits: 2, signed: true },
  ];

  const MONEY = [
    {
      key: "m2_yoy",
      ids: ["m2_yoy"],
      label: "M2 GROWTH",
      min: 0,
      max: 16,
      major: 2,
      minor: 1,
      digits: 2,
      bands: [
        { from: 0, to: 1, color: "#e23b2f" },
        { from: 1, to: 3, color: "#ffe14a" },
        { from: 3, to: 6, color: "#3dcc6f" },
        { from: 6, to: 9, color: "#ffe14a" },
        { from: 9, to: 16, color: "#e23b2f" },
      ],
    },
    {
      key: "m2v",
      ids: ["m2v"],
      label: "M2 VELOCITY",
      min: 1.0,
      max: 2.4,
      major: 0.2,
      minor: 0.1,
      digits: 3,
      bands: [
        { from: 1.0, to: 1.2, color: "#e23b2f" },
        { from: 1.2, to: 1.4, color: "#ffe14a" },
        { from: 1.4, to: 1.8, color: "#3dcc6f" },
        { from: 1.8, to: 2.1, color: "#ffe14a" },
        { from: 2.1, to: 2.4, color: "#e23b2f" },
      ],
    },
    {
      key: "loans_yoy",
      ids: ["loans_yoy"],
      label: "BANK CREDIT",
      min: -5,
      max: 20,
      major: 5,
      minor: 2.5,
      digits: 2,
      bands: [
        { from: -5, to: 0, color: "#e23b2f" },
        { from: 0, to: 2, color: "#ffe14a" },
        { from: 2, to: 8, color: "#3dcc6f" },
        { from: 8, to: 12, color: "#ffe14a" },
        { from: 12, to: 20, color: "#e23b2f" },
      ],
    },
    {
      key: "money_multiplier",
      ids: ["money_multiplier"],
      label: "MONEY MULTIPLIER",
      min: 2,
      max: 6,
      major: 1,
      minor: 0.5,
      digits: 2,
      bands: [
        { from: 2, to: 3, color: "#e23b2f" },
        { from: 3, to: 3.5, color: "#ffe14a" },
        { from: 3.5, to: 4.5, color: "#3dcc6f" },
        { from: 4.5, to: 5.5, color: "#ffe14a" },
        { from: 5.5, to: 6, color: "#e23b2f" },
      ],
    },
  ];

  const MONEY_LIGHTS = [
    { seriesId: "m2_yoy", label: "K-PERCENT", trip: (v) => v < 2 || v > 7, digits: 2 },
    { seriesId: "excess_money", label: "EXCESS MONEY", trip: (v) => v >= 3, digits: 2, signed: true },
    { seriesId: "loans_yoy", label: "CREDIT BOOM", trip: (v) => v >= 10, digits: 2 },
    { seriesId: "tdsp", label: "DEBT SERVICE", trip: (v) => v >= 12, digits: 2 },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function byId(series) {
    const map = Object.create(null);
    for (const s of series) map[s.id] = s;
    return map;
  }

  function pick(map, ids) {
    for (const id of ids) {
      if (map[id] && map[id].available !== false && Number.isFinite(map[id].value)) return map[id];
    }
    return null;
  }

  function headlineSeries(map, spec) {
    return pick(map, spec.ids) || Object.values(map).find((s) => s.headline === spec.key && Number.isFinite(s.value)) || null;
  }

  function statusOf(s) {
    if (!s || !Number.isFinite(s.value)) return "watch";
    const id = s.id;
    const v = s.value;
    if (id === "cpi" || id === "cpi_core" || id === "pce" || id === "cpi_usa_wb") {
      if (v > 4) return "alarm";
      if (v > 2.5) return "watch";
      return "ok";
    }
    if (id === "unrate" || id === "uem_usa" || id === "u6rate") {
      const alarm = id === "u6rate" ? 8 : 6;
      const watch = id === "u6rate" ? 7 : 4.5;
      if (v >= alarm) return "alarm";
      if (v >= watch) return "watch";
      return "ok";
    }
    if (id === "gdp_usa" || id === "gdp_us_q" || id === "gdp_wld" || id === "gdp_euu" || id === "gdp_jpn") {
      if (v < 0) return "alarm";
      if (v < 1.5) return "watch";
      return "ok";
    }
    if (id === "vix") {
      if (v >= 30) return "alarm";
      if (v >= 20) return "watch";
      return "ok";
    }
    if (id === "spread_2s10s" || id === "t10y2y" || id === "spread_bills10s") {
      if (v < 0) return "alarm";
      if (v < 0.25) return "watch";
      return "ok";
    }
    if (id === "hy_oas") {
      if (v >= 6) return "alarm";
      if (v >= 4) return "watch";
      return "ok";
    }
    if (id === "icsa") {
      if (v >= 400000) return "alarm";
      if (v >= 280000) return "watch";
      return "ok";
    }
    if (id === "fedfunds" || id === "irx") {
      if (v >= 6) return "alarm";
      if (v >= 5) return "watch";
      return "ok";
    }
    if (id === "real_policy_rate") {
      if (v < 0 || v > 4.5) return "alarm";
      if (v < 1 || v > 3) return "watch";
      return "ok";
    }
    if (id === "nfci") {
      if (v > 0.5) return "alarm";
      if (v >= 0) return "watch";
      return "ok";
    }
    if (id === "real_m2") {
      if (v < 0 || v > 12) return "alarm";
      if (v < 2 || v > 8) return "watch";
      return "ok";
    }
    if (id === "sahm") {
      if (v >= 0.5) return "alarm";
      if (v >= 0.3) return "watch";
      return "ok";
    }
    if (id === "taylor_gap") {
      if (Math.abs(v) >= 1.5) return "alarm";
      if (Math.abs(v) >= 1) return "watch";
      return "ok";
    }
    if (id === "spread_3m10s" || id === "t10y3m") {
      if (v < 0) return "alarm";
      if (v < 0.25) return "watch";
      return "ok";
    }
    if (id === "t5yifr") {
      if (v >= 3.5) return "alarm";
      if (v >= 3 || v <= 1.5) return "watch";
      return "ok";
    }
    if (id === "m2_yoy") {
      if (v < 1 || v > 9) return "alarm";
      if (v < 3 || v > 6) return "watch";
      return "ok";
    }
    if (id === "m2v") {
      if (v < 1.2 || v > 2.1) return "alarm";
      if (v < 1.4 || v > 1.8) return "watch";
      return "ok";
    }
    if (id === "loans_yoy") {
      if (v < 0 || v > 12) return "alarm";
      if (v < 2 || v > 8) return "watch";
      return "ok";
    }
    if (id === "money_multiplier") {
      const p90 = s.p90;
      if (v < 3 || v > 5.5 || (Number.isFinite(p90) && v > p90)) return "alarm";
      if (v < 3.5 || v > 4.5) return "watch";
      return "ok";
    }
    if (id === "excess_money") {
      if (v >= 3) return "alarm";
      if (v >= 1.5 || v <= -3) return "watch";
      return "ok";
    }
    if (id === "tdsp") {
      if (v >= 12) return "alarm";
      if (v >= 11.5) return "watch";
      return "ok";
    }
    if (id === "base_yoy") {
      if (v < 0 || v > 12) return "alarm";
      if (v < 2 || v > 8) return "watch";
      return "ok";
    }
    if (id === "u_gap_nrou") {
      if (v >= 1 || v <= -1.5) return "alarm";
      if (v >= 0.5 || v <= -0.5) return "watch";
      return "ok";
    }
    if (id === "credit_gdp") {
      if (v >= 4.0 || v < 2.5) return "alarm";
      if (v >= 3.6) return "watch";
      return "ok";
    }
    if (Number.isFinite(s.changePct)) {
      if (Math.abs(s.changePct) >= 5) return "watch";
    }
    return "ok";
  }

  function fmtNum(v, digits) {
    if (!Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    const d = digits != null ? digits : abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
    return v.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function fmtValue(s) {
    const v = s.value;
    if (!Number.isFinite(v)) return "—";
    if (s.unit === "USD" && v >= 1e12) return (v / 1e12).toFixed(2) + "T";
    if (s.unit === "USD" && v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (s.unit === "claims" || s.id === "icsa") return Math.round(v).toLocaleString("en-US");
    if (s.unit === "thousands" || s.id === "payems") return Math.round(v).toLocaleString("en-US");
    if (s.id === "btc" || s.id === "eth" || s.id === "gold" || s.id === "platinum") return fmtNum(v, 0);
    if (s.id === "spx" || s.id === "nasdaq" || s.id === "dow" || s.id === "dax") return fmtNum(v, 0);
    if (s.id === "walcl_t" || s.unit === "$T") return fmtNum(v, 2);
    if (s.unit === "bn USD") return fmtNum(v, v >= 100 ? 1 : 2);
    if (s.unit === "thousands SAAR" || s.id === "houst") return fmtNum(v, 0);
    if (s.id === "m2v") return fmtNum(v, 3);
    if (s.id === "higher_order_ratio") return fmtNum(v, 3);
    if (s.id === "gold_silver") return fmtNum(v, 1);
    if (s.id === "credit_gdp" || s.unit === "× GDP" || s.unit === "M2/base" || s.unit === "ratio") return fmtNum(v, 2);
    if (s.unit === "% of DI") return fmtNum(v, 2);
    if (s.unit === "%" || s.unit === "% YoY" || s.unit === "% SAAR" || s.unit === "pp" || s.unit === "vol" || s.unit === "idx") {
      return fmtNum(v, Math.abs(v) >= 10 ? 1 : 2);
    }
    if (s.id === "copper_gold" || (s.unit && s.unit.indexOf("x1000") !== -1)) {
      return fmtNum(v, 2);
    }
    return fmtNum(v, 2);
  }

  function isPercentish(s) {
    return s.unit === "%" || s.unit === "% YoY" || s.unit === "% SAAR" || s.unit === "pp" || s.unit === "vol" || s.unit === "% of DI";
  }

  function fmtDelta(s) {
    if (!s) return { text: "—", dir: "fl" };
    const signed = Number.isFinite(s.change) ? s.change : s.changePct;
    const dir = Number.isFinite(signed) ? (signed > 0 ? "up" : signed < 0 ? "dn" : "fl") : "fl";
    if (isPercentish(s) && Number.isFinite(s.change)) {
      const sign = s.change > 0 ? "+" : "";
      return { text: `${sign}${s.change.toFixed(2)} pp`, dir };
    }
    if (Number.isFinite(s.changePct)) {
      const sign = s.changePct > 0 ? "+" : "";
      return { text: `${sign}${s.changePct.toFixed(2)}%`, dir };
    }
    if (Number.isFinite(s.change)) {
      const sign = s.change > 0 ? "+" : "";
      return { text: `${sign}${fmtNum(s.change, 2)}`, dir };
    }
    return { text: "—", dir: "fl" };
  }

  function fmtAsOf(iso) {
    if (!iso) return "";
    const cal = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (cal) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return months[Number(cal[2]) - 1] + " " + cal[3] + ", " + cal[1];
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      if (/^\d{4}$/.test(iso)) return iso;
      if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
      return String(iso).slice(0, 10);
    }
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(d);
    } catch (e) {
      return iso.slice(0, 10);
    }
  }

  function fmtAsOfLong(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d) + " ET";
    } catch (e) {
      return iso;
    }
  }

  function sparkline(history, dir) {
    const nums = (history || []).filter((n) => typeof n === "number" && Number.isFinite(n));
    if (nums.length < 2) return "";
    const w = 180;
    const h = 28;
    const min = Math.min.apply(null, nums);
    const max = Math.max.apply(null, nums);
    const span = max - min || 1;
    const pts = nums
      .map((n, i) => {
        const x = (i / (nums.length - 1)) * (w - 2) + 1;
        const y = h - 2 - ((n - min) / span) * (h - 4);
        return x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");
    const color = dir === "dn" ? "#e23b2f" : dir === "up" ? "#3ec6c9" : "#8a7a55";
    return `<svg class="ecr-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="1.4" points="${pts}"/></svg>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function explainMap() {
    return (globalThis.ECR_EXPLAIN && typeof globalThis.ECR_EXPLAIN === "object")
      ? globalThis.ECR_EXPLAIN
      : {};
  }

  function tipHTML() {
    const map = explainMap();
    for (let i = 0; i < arguments.length; i++) {
      const id = arguments[i];
      if (id && map[id]) {
        return `<div class="ecr-tip" role="tooltip">${escapeHtml(map[id])}</div>`;
      }
    }
    return "";
  }


  function regimeOf(map) {
    const inf = headlineSeries(map, HEADLINES[2]);
    const un = headlineSeries(map, HEADLINES[1]);
    const gdp = headlineSeries(map, HEADLINES[0]);
    const curve = pick(map, ["t10y2y", "spread_2s10s", "spread_bills10s"]);
    const vix = map.vix;

    const bits = [];
    if (inf) bits.push(`CPI ${inf.value.toFixed(2)}%`);
    if (un) bits.push(`U ${un.value.toFixed(1)}%`);
    if (curve) bits.push(`2s10s ${curve.value >= 0 ? "+" : ""}${curve.value.toFixed(2)}`);
    if (gdp) bits.push(`GDP ${gdp.value.toFixed(2)}%`);

    let label = "MIXED TAPE";
    let klass = "is-watch";

    const iv = inf ? inf.value : null;
    const uv = un ? un.value : null;
    const cv = curve ? curve.value : null;
    const gv = gdp ? gdp.value : null;
    const xv = vix ? vix.value : null;

    if (cv != null && cv < 0 && uv != null && uv >= 4.8) {
      label = "RECESSION RISK";
      klass = "is-alarm";
    } else if (iv != null && iv >= 4 && uv != null && uv >= 5) {
      label = "STAGFLATION WATCH";
      klass = "is-alarm";
    } else if (iv != null && iv >= 4) {
      label = "INFLATION HOT";
      klass = "is-alarm";
    } else if (gv != null && gv < 0) {
      label = "CONTRACTION";
      klass = "is-alarm";
    } else if (cv != null && cv < 0) {
      label = "CURVE INVERTED";
      klass = "is-watch";
    } else if (iv != null && iv > 2.5 && iv < 4 && uv != null && uv < 5 && (gv == null || gv >= 1.5)) {
      label = "SOFT LANDING";
      klass = "is-ok";
    } else if (iv != null && iv <= 2.5 && uv != null && uv <= 4.5 && (cv == null || cv >= 0)) {
      label = "EXPANSION";
      klass = "is-ok";
    } else if (xv != null && xv >= 25) {
      label = "RISK-OFF";
      klass = "is-watch";
    }

    const lagged = [inf, un, gdp].some((s) => s && (s.source === "worldbank" || s.frequency === "annual"));
    let sub = bits.join(" · ");
    if (lagged) sub += "  //  some headlines still on annual World Bank";
    return { label, klass, sub };
  }

  function tileHTML(s) {
    const st = statusOf(s);
    const d = fmtDelta(s);
    const asof = fmtAsOf(s.asOf);
    const note = s.asOfNote
      ? `<div class="ecr-tile-note">${escapeHtml(s.asOfNote)}</div>`
      : "";
    return `<article class="ecr-tile ecr-st-${st}${s.constructed ? " ecr-tile-constructed" : ""}" data-id="${escapeHtml(s.id)}" tabindex="0">
      <div class="ecr-tile-head">
        <div class="ecr-tile-name">${escapeHtml(s.name)}</div>
        <span class="ecr-pill" title="${st}"></span>
      </div>
      <div class="ecr-tile-val">${fmtValue(s)}<span class="ecr-tile-unit">${escapeHtml(s.unit || "")}</span></div>
      <div class="ecr-tile-row">
        <span class="ecr-delta ${d.dir}">${escapeHtml(d.text)}</span>
        <span class="ecr-asof">${escapeHtml(asof)}</span>
      </div>
      ${sparkline(s.history, d.dir)}
      ${note}
      <div class="ecr-tile-src">${escapeHtml(s.constructed ? "derived · constructed" : (s.source || ""))}</div>
      ${tipHTML(s.id)}
    </article>`;
  }


  const LIGHT_NOTE = {
    sahm: "Sahm rule: 3-month unemployment is 0.50+ above its prior-year low.",
    spread_3m10s: "3m10s yield curve is inverted (10-year below 3-month).",
    icsa: "Initial claims at or above the 280k trip line.",
    taylor_gap: "Fed funds is 1.50+ pp off the 1993 Taylor rule.",
    m2_yoy: "M2 YoY is outside Friedman's 2–7% k-percent band.",
    excess_money: "M2 is growing 3+ pp faster than NGDP.",
    loans_yoy: "Bank credit is growing 10%+ YoY (credit-boom trip).",
    tdsp: "Household debt service is at or above 12% of disposable income.",
  };

  function ensureOpsHosts() {
    const panel = document.getElementById("econ-panel");
    if (!panel || $("ecr-ops")) return;
    const ops = document.createElement("section");
    ops.className = "ecr-ops";
    ops.id = "ecr-ops";
    ops.setAttribute("aria-label", "Engine status");
    ops.innerHTML = '<div class="ecr-status is-go" id="ecr-status">' +
      '<div class="ecr-status-tag">ENGINE STATUS</div>' +
      '<div class="ecr-status-copy">' +
      '<div class="ecr-status-msg" id="ecr-status-msg">ACQUIRING…</div>' +
      '<div class="ecr-status-sub" id="ecr-status-sub">awaiting telemetry</div>' +
      "</div></div>" +
      '<div class="ecr-alert is-empty" id="ecr-alert" hidden>' +
      '<div class="ecr-alert-hd">ALERT</div>' +
      '<ul class="ecr-alert-list" id="ecr-alert-list"></ul></div>';
    const mast = panel.querySelector(".ecr-mast");
    if (mast) mast.insertAdjacentElement("afterend", ops);
    else panel.insertBefore(ops, panel.firstChild);
  }

  function collectWatchItems(map) {
    const items = [];
    const seen = new Set();

    function push(id, name, reading, level, note) {
      if (seen.has(id)) return;
      seen.add(id);
      items.push({ id: id, name: name, reading: reading, level: level, note: note });
    }

    for (const spec of LIGHTS.concat(MONEY_LIGHTS)) {
      const s = map[spec.seriesId];
      if (!s || !Number.isFinite(s.value)) continue;
      if (!spec.trip(s.value)) continue;
      push(
        spec.seriesId,
        spec.label,
        fmtLightReading(spec, s),
        "trip",
        LIGHT_NOTE[spec.seriesId] || "Trip light is on."
      );
    }

    const gaugeRows = HEADLINES.concat(PRESSURE, MONEY);
    for (const spec of gaugeRows) {
      const s = headlineSeries(map, spec);
      if (!s || !Number.isFinite(s.value)) continue;
      const zone = needleZoneColor(spec, s.value);
      if (!zone || zone === "#3dcc6f") continue;
      const level = zone === "#e23b2f" ? "alarm" : "watch";
      const unit = s.unit ? " " + s.unit : "";
      push(
        spec.key || s.id,
        spec.label,
        fmtValue(s) + unit,
        level,
        level === "alarm"
          ? "Needle is in the red band. Watch this gauge."
          : "Needle is in the yellow band. Monitor more closely."
      );
    }

    const rank = { trip: 0, alarm: 1, watch: 2 };
    items.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
    return items;
  }

  function renderStatus(map) {
    ensureOpsHosts();
    const items = collectWatchItems(map);
    const trips = items.filter(function (i) { return i.level === "trip"; });
    const alarms = items.filter(function (i) { return i.level === "alarm"; });
    const watches = items.filter(function (i) { return i.level === "watch"; });

    const box = $("ecr-status");
    const msg = $("ecr-status-msg");
    const sub = $("ecr-status-sub");
    let klass = "is-go";
    let title = "ALL SYSTEMS GO";
    let detail = "Trip lights clear. Headline gauges in the green.";

    if (trips.length || alarms.length) {
      const hot = trips.length + alarms.length;
      if (hot >= 2 || trips.length >= 2) {
        klass = "is-alert";
        title = "ALERT";
        const names = trips.concat(alarms).map(function (i) { return i.name; }).slice(0, 3).join(" · ");
        detail = hot + " conditions in the red — " + names;
      } else {
        klass = "is-caution";
        const one = trips[0] || alarms[0];
        title = "CAUTION — " + one.name;
        detail = one.note;
      }
    } else if (watches.length) {
      klass = "is-watch";
      title = "WATCH";
      detail = watches.length === 1
        ? watches[0].name + " is off the green band."
        : watches.length + " gauges on the yellow band — monitor the alert list.";
    }

    if (box) {
      box.classList.remove("is-go", "is-watch", "is-caution", "is-alert");
      box.classList.add(klass);
    }
    if (msg) msg.textContent = title;
    if (sub) sub.textContent = detail;

    const alert = $("ecr-alert");
    const list = $("ecr-alert-list");
    if (!alert || !list) return;
    if (!items.length) {
      alert.hidden = true;
      alert.classList.add("is-empty");
      alert.classList.remove("is-hot");
      list.innerHTML = "";
      return;
    }
    alert.hidden = false;
    alert.classList.remove("is-empty");
    alert.classList.toggle("is-hot", trips.length + alarms.length > 0);
    list.innerHTML = items.map(function (i) {
      const flag = i.level === "trip" ? "TRIP" : i.level === "alarm" ? "RED" : "WATCH";
      return '<li class="ecr-alert-item ecr-alert-' + i.level + '" data-id="' + escapeHtml(i.id) + '">' +
        '<span class="ecr-alert-flag">' + flag + "</span>" +
        '<span class="ecr-alert-name">' + escapeHtml(i.name) + "</span>" +
        '<span class="ecr-alert-read">' + escapeHtml(i.reading) + "</span>" +
        '<span class="ecr-alert-note">' + escapeHtml(i.note) + "</span></li>";
    }).join("");
  }

  function ensurePressureHosts() {
    const hero = document.querySelector("#econ-panel .ecr-hero");
    if (!hero) return;
    if (!$("ecr-pressure")) {
      const pressRack = document.createElement("div");
      pressRack.className = "ecr-rack";
      pressRack.textContent = "PRESSURE / THEORY";
      const press = document.createElement("div");
      press.className = "ecr-gauges ecr-gauges-pressure";
      press.id = "ecr-pressure";
      const lightRack = document.createElement("div");
      lightRack.className = "ecr-rack";
      lightRack.textContent = "WARNING LIGHTS / TRIP";
      const lights = document.createElement("div");
      lights.className = "ecr-lights";
      lights.id = "ecr-lights";
      lights.setAttribute("role", "status");
      lights.setAttribute("aria-label", "Warning lights");
      hero.appendChild(pressRack);
      hero.appendChild(press);
      hero.appendChild(lightRack);
      hero.appendChild(lights);
    }
    if (!$("ecr-money")) {
      const moneyRack = document.createElement("div");
      moneyRack.className = "ecr-rack";
      moneyRack.id = "ecr-money-rack";
      moneyRack.textContent = "MONEY / CREDIT  (Mises · Menger · Rothbard · Friedman)";
      const money = document.createElement("div");
      money.className = "ecr-gauges ecr-gauges-pressure ecr-gauges-money";
      money.id = "ecr-money";
      const austRack = document.createElement("div");
      austRack.className = "ecr-rack";
      austRack.textContent = "AUSTRIAN / MONETARIST";
      const austLights = document.createElement("div");
      austLights.className = "ecr-lights";
      austLights.id = "ecr-lights-money";
      austLights.setAttribute("role", "status");
      austLights.setAttribute("aria-label", "Austrian and monetarist warning lights");
      hero.appendChild(moneyRack);
      hero.appendChild(money);
      hero.appendChild(austRack);
      hero.appendChild(austLights);
    }
  }


  function needleZoneColor(spec, value) {
    const bands = spec && spec.bands;
    if (!bands || !bands.length || !Number.isFinite(value)) return "";
    let hex = "";
    for (const b of bands) {
      const lo = b.from;
      const hi = b.to;
      if (value >= lo && value <= hi) {
        hex = b.color;
        break;
      }
    }
    if (!hex) {
      if (value < bands[0].from) hex = bands[0].color;
      else hex = bands[bands.length - 1].color;
    }
    const h = String(hex).toLowerCase();
    if (h === "#3ec6c9" || h === "#1f8f93" || h === "#3dcc6f") return "#3dcc6f";
    if (h === "#ffe14a" || h === "#e6c04a" || h === "#f0a202") return "#ffe14a";
    if (h === "#e23b2f") return "#e23b2f";
    return hex;
  }

  function renderGaugeRow(host, specs, map) {
    if (!host) return;
    host.innerHTML = "";
    for (const spec of specs) {
      const s = headlineSeries(map, spec);
      const wrap = document.createElement("div");
      const st = s ? statusOf(s) : "watch";
      wrap.className = "ecr-gauge ecr-st-" + st;
      wrap.tabIndex = 0;
      if (spec.key) wrap.setAttribute("data-key", spec.key);
      const face = document.createElement("div");
      wrap.appendChild(face);
      const meta = document.createElement("div");
      meta.className = "ecr-gauge-meta";
      const zone = s ? needleZoneColor(spec, s.value) : "";
      if (s) {
        meta.innerHTML = `<div class="ecr-gauge-name"${zone ? ` style="color:${zone}"` : ""}>${escapeHtml(spec.label)}</div>
          <div class="ecr-gauge-read">${fmtValue(s)}<span class="ecr-gauge-unit">${escapeHtml(s.unit || "")}</span></div>
          <div class="ecr-gauge-asof">${escapeHtml(s.name)} · ${escapeHtml(s.asOfNote || fmtAsOf(s.asOf))}</div>`;
      } else {
        meta.innerHTML = `<div class="ecr-gauge-name">${escapeHtml(spec.label)}</div>
          <div class="ecr-gauge-read">OFFLINE</div>
          <div class="ecr-gauge-asof">no feed</div>`;
      }
      wrap.appendChild(meta);
      const gTip = tipHTML(spec.key, s && s.id);
      if (gTip) wrap.insertAdjacentHTML("beforeend", gTip);
      host.appendChild(wrap);
      if (globalThis.ECRGauges) {
        ECRGauges.draw(face, {
          value: s ? s.value : NaN,
          min: spec.min,
          max: spec.max,
          major: spec.major,
          minor: spec.minor,
          bands: spec.bands,
          status: st,
          label: spec.label,
          needleColor: zone || undefined,
        });
      }
    }
  }

  function renderGauges(map) {
    renderGaugeRow($("ecr-gauges"), HEADLINES, map);
    renderGaugeRow($("ecr-pressure"), PRESSURE, map);
    renderGaugeRow($("ecr-money"), MONEY, map);
  }

  function fmtLightReading(spec, s) {
    if (!s || !Number.isFinite(s.value)) return "—";
    if (spec.claims) return Math.round(s.value).toLocaleString("en-US");
    const v = s.value;
    const body = Math.abs(v).toFixed(spec.digits != null ? spec.digits : 2);
    if (spec.signed) return (v > 0 ? "+" : v < 0 ? "−" : "") + body;
    return (v < 0 ? "−" : "") + body;
  }

  function renderLightsInto(host, specs, map) {
    if (!host) return;
    host.innerHTML = specs.map((spec) => {
      const s = map[spec.seriesId];
      let state = "offline";
      let stateText = "OFFLINE";
      if (s && Number.isFinite(s.value)) {
        if (spec.trip(s.value)) {
          state = "trip";
          stateText = "TRIP";
        } else {
          state = "clear";
          stateText = "CLEAR";
        }
      }
      const reading = fmtLightReading(spec, s);
      return `<div class="ecr-light ecr-light-${state}" data-id="${escapeHtml(spec.seriesId)}" tabindex="0">
        <div class="ecr-light-name">${escapeHtml(spec.label)}</div>
        <div class="ecr-light-read">${escapeHtml(reading)}</div>
        <div class="ecr-light-state">${stateText}</div>
        ${tipHTML(spec.seriesId, spec.label)}
      </div>`;
    }).join("");
  }

  function renderLights(map) {
    renderLightsInto($("ecr-lights"), LIGHTS, map);
    renderLightsInto($("ecr-lights-money"), MONEY_LIGHTS, map);
  }

  function renderBoards(map, series) {
    const host = $("ecr-boards");
    if (!host) return;
    const groups = {};
    for (const sec of SECTIONS) groups[sec.id] = [];
    for (const s of series) {
      if (SKIP_TILE_IDS.has(s.id) || s.hidden) continue;
      if (!s.available && s.value == null) continue;
      let sid = s.section;
      if (sid === "theory") sid = "money";
      const sec = groups[sid] ? sid : "macro";
      groups[sec].push(s);
    }
    const html = [];
    for (const sec of SECTIONS) {
      const rows = groups[sec.id];
      if (!rows.length) continue;
      const gridClass = sec.id === "money" ? "ecr-section-grid ecr-grid-5x6" : "ecr-section-grid";
      html.push(`<section class="ecr-section" data-section="${sec.id}">
        <div class="ecr-rack"><i></i> ${sec.label} <i></i></div>
        <div class="${gridClass}">${rows.map(tileHTML).join("")}</div>
      </section>`);
    }
    host.innerHTML = html.join("") || `<div class="ecr-empty">No series in latest.json</div>`;
  }

  function renderTicker(map) {
    const track = $("ecr-ticker-track");
    if (!track) return;
    const bits = [];
    for (const id of TICKER_IDS) {
      const s = map[id];
      if (!s) continue;
      const d = fmtDelta(s);
      bits.push(
        `<span class="ecr-tick"><b>${escapeHtml(s.name)}</b> ${fmtValue(s)} <span class="${d.dir}">${escapeHtml(d.text)}</span></span>`
      );
    }
    const line = bits.join("");
    track.innerHTML = line + line;
  }

  function renderMast(data, map) {
    const r = regimeOf(map);
    const el = $("ecr-regime");
    const sub = $("ecr-regime-sub");
    if (el) {
      el.textContent = r.label;
      el.classList.remove("is-ok", "is-watch", "is-alarm");
      el.classList.add(r.klass);
    }
    if (sub) sub.textContent = r.sub;

    const fetched = data.fetchedAt;
    if ($("ecr-updated")) $("ecr-updated").textContent = fmtAsOfLong(fetched);

    const stale = $("ecr-stale");
    if (stale && fetched) {
      const ageH = (Date.now() - new Date(fetched).getTime()) / 36e5;
      if (ageH < 2) {
        stale.textContent = "LIVE FEED";
        stale.className = "ecr-stale is-live";
      } else if (ageH < 36) {
        stale.textContent = "HOLDING LAST PRINT";
        stale.className = "ecr-stale is-stale";
      } else {
        stale.textContent = "STALE";
        stale.className = "ecr-stale is-dead";
      }
    }

    const alarms = Object.values(map).filter((s) => statusOf(s) === "alarm").length;
    const watches = Object.values(map).filter((s) => statusOf(s) === "watch").length;
    $("ecr-lamp-ok") && $("ecr-lamp-ok").classList.toggle("on", alarms === 0);
    $("ecr-lamp-watch") && $("ecr-lamp-watch").classList.toggle("on", watches > 0 || alarms > 0);
    $("ecr-lamp-alarm") && $("ecr-lamp-alarm").classList.toggle("on", alarms > 0);

    const sources = new Set(Object.values(map).map((s) => s.source).filter(Boolean));
    if ($("ecr-src")) $("ecr-src").textContent = "SOURCES " + [...sources].join(" · ").toUpperCase();
  }

  function tickClock() {
    const now = new Date();
    try {
      if ($("ecr-clock")) {
        $("ecr-clock").textContent = new Intl.DateTimeFormat("en-GB", {
          timeZone: TZ,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now);
      }
      if ($("ecr-date")) {
        $("ecr-date").textContent = new Intl.DateTimeFormat("en-US", {
          timeZone: TZ,
          weekday: "short",
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).format(now);
      }
    } catch (e) {
      if ($("ecr-clock")) $("ecr-clock").textContent = now.toISOString().slice(11, 19);
    }
  }

  function paint(data) {
    const series = (data && data.series) || [];
    const map = byId(series);
    renderMast(data, map);
    ensureOpsHosts();
    ensurePressureHosts();
    renderStatus(map);
    renderGauges(map);
    renderLights(map);
    renderBoards(map, series);
    renderTicker(map);
  }

  async function loadJson() {
    try {
      const res = await fetch("data/latest.json", { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (e) {
      /* file:// or offline — fall through */
    }
    if (globalThis.ECR_DATA) return globalThis.ECR_DATA;
    throw new Error("no telemetry");
  }

  async function refreshCrypto(data) {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true"
      );
      if (!res.ok) return;
      const json = await res.json();
      const map = byId(data.series);
      if (json.bitcoin && map.btc && Number.isFinite(json.bitcoin.usd)) {
        map.btc.value = json.bitcoin.usd;
        map.btc.change = null;
        map.btc.changePct = json.bitcoin.usd_24h_change;
        map.btc.asOf = json.bitcoin.last_updated_at
          ? new Date(json.bitcoin.last_updated_at * 1000).toISOString()
          : new Date().toISOString();
      }
      if (json.ethereum && map.eth && Number.isFinite(json.ethereum.usd)) {
        map.eth.value = json.ethereum.usd;
        map.eth.change = null;
        map.eth.changePct = json.ethereum.usd_24h_change;
        map.eth.asOf = json.ethereum.last_updated_at
          ? new Date(json.ethereum.last_updated_at * 1000).toISOString()
          : new Date().toISOString();
      }
      paint(data);
    } catch (e) {
      /* CORS or rate limit — keep committed prints */
    }
  }

  async function boot() {
    tickClock();
    setInterval(tickClock, 1000);
    try {
      const data = await loadJson();
      paint(data);
      refreshCrypto(data);
    } catch (err) {
      if ($("ecr-regime")) $("ecr-regime").textContent = "NO TELEMETRY";
      if ($("ecr-regime-sub")) $("ecr-regime-sub").textContent = String(err.message || err);
      if ($("ecr-boards")) $("ecr-boards").innerHTML = `<div class="ecr-empty">Could not read data/latest.json</div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
