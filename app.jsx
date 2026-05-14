// UI shell — React components for the dashboard chrome.
// Depends on window.GlobeEngine, window.MOCK_DATA, window.COASTLINES, window.THEMES

const { useState, useEffect, useRef, useMemo } = React;

function isTodayUtc(ts) {
  const d = new Date(Number(ts) || Date.now());
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear()
    && d.getUTCMonth() === now.getUTCMonth()
    && d.getUTCDate() === now.getUTCDate();
}

// ============ THEMES ============
window.THEMES = {
  tactical: {
    name: "TACTICAL",
    bg1: "#050b17", bg2: "#08142a", panel: "#0a1930", panelEdge: "#1a3153",
    text: "#cfe2ff", textDim: "#7a94b8", accent: "#3b8df5", accentWarm: "#f5b142",
    classification: "#f5b142",
    // Globe
    glow: "#1a4d8f", core: "#061528", surfaceWater: "#03283b",
    grid: "#1e4f86", gridStrong: "#3b8df5",
    land: "#75c7ff", landFill: "#01070d", surfaceLand: "#01070d",
    river: "#4bc6e8", mountain: "#d4b16a",
    city: "#ffffff",
    storm: "#a38bff", stormHi: "#d85cff",
    lane: "#7bd6a8", container: "#7bd6a8", oil: "#f5a742", lng: "#9ad4ff", truck: "#7bd6a8",
    flight: "#ffd96e", flightLine: "#ffd96e",
    satLeo: "#6ee7f5", satMeo: "#a9b9ff", satGeo: "#ff8fcf",
  },
  situation: {
    name: "SITUATION ROOM",
    bg1: "#0d0a07", bg2: "#14100b", panel: "#1a1510", panelEdge: "#3a2f22",
    text: "#ffe8c7", textDim: "#a08766", accent: "#f59431", accentWarm: "#f59431",
    classification: "#f59431",
    glow: "#7a3e10", core: "#0a0804", surfaceWater: "#142b38",
    grid: "#4a3420", gridStrong: "#8a5a28",
    land: "#e8b779", landFill: "#070604", surfaceLand: "#070604",
    river: "#8cb8c8", mountain: "#d88836",
    city: "#ffe6b8",
    storm: "#ff7a3a", stormHi: "#ff3a3a",
    lane: "#c8a060", container: "#c8a060", oil: "#ff8f38", lng: "#e6cc90", truck: "#c8a060",
    flight: "#ffd080", flightLine: "#ffd080",
    satLeo: "#d8c88a", satMeo: "#e0a060", satGeo: "#ff7050",
  },
  hud: {
    name: "HUD",
    bg1: "#020a0c", bg2: "#02141a", panel: "#03151b", panelEdge: "#0c4152",
    text: "#d4fbff", textDim: "#5d8a95", accent: "#1de8f0", accentWarm: "#f5e342",
    classification: "#1de8f0",
    glow: "#0a9fb8", core: "#021418", surfaceWater: "#033746",
    grid: "#1b6b7a", gridStrong: "#1de8f0",
    land: "#86f4ff", landFill: "#01090b", surfaceLand: "#01090b",
    river: "#70e8d4", mountain: "#b8f0a0",
    city: "#ffffff",
    storm: "#f058ff", stormHi: "#ff4080",
    lane: "#1de8f0", container: "#1de8f0", oil: "#ffb040", lng: "#c8f0ff", truck: "#1de8f0",
    flight: "#f5e342", flightLine: "#f5e342",
    satLeo: "#70e8ff", satMeo: "#a8a0ff", satGeo: "#ff70d4",
  },
};

// ============ LAYER DEFINITIONS ============
const NATO_MEMBER_CODES = ['ALB','BEL','BGR','CAN','HRV','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','ISL','ITA','LVA','LTU','LUX','MNE','MKD','NOR','POL','PRT','ROU','SVK','SVN','ESP','SWE','NLD','TUR','GBR','USA'];
const BRICS_MEMBER_CODES = ['BRA','RUS','IND','CHN','ZAF','EGY','ETH','IRN','ARE','IDN','SAU'];

const RAW_DIPLOMACY_COUNTRIES = [
  { code: 'ALB', name: 'Albania', lat: 41.2, lon: 20.2 },
  { code: 'BEL', name: 'Belgium', lat: 50.5, lon: 4.5 },
  { code: 'BGR', name: 'Bulgaria', lat: 42.7, lon: 25.5 },
  { code: 'CAN', name: 'Canada', lat: 56.1, lon: -106.3, allies: ['USA','GBR','FRA','DEU','AUS'], adversaries: ['RUS'] },
  { code: 'HRV', name: 'Croatia', lat: 45.1, lon: 15.2 },
  { code: 'CZE', name: 'Czechia', lat: 49.8, lon: 15.5 },
  { code: 'DNK', name: 'Denmark', lat: 56.0, lon: 10.0 },
  { code: 'EST', name: 'Estonia', lat: 58.6, lon: 25.0, adversaries: ['RUS'] },
  { code: 'FIN', name: 'Finland', lat: 61.9, lon: 25.7, adversaries: ['RUS'] },
  { code: 'FRA', name: 'France', lat: 46.2, lon: 2.2, allies: ['USA','GBR','DEU','ITA','ESP','POL'], adversaries: ['RUS'] },
  { code: 'DEU', name: 'Germany', lat: 51.2, lon: 10.4, allies: ['USA','GBR','FRA','ITA','POL','NLD'], adversaries: ['RUS'] },
  { code: 'GRC', name: 'Greece', lat: 39.1, lon: 22.9 },
  { code: 'HUN', name: 'Hungary', lat: 47.2, lon: 19.5 },
  { code: 'ISL', name: 'Iceland', lat: 64.9, lon: -18.6 },
  { code: 'ITA', name: 'Italy', lat: 42.8, lon: 12.6 },
  { code: 'LVA', name: 'Latvia', lat: 56.9, lon: 24.6, adversaries: ['RUS'] },
  { code: 'LTU', name: 'Lithuania', lat: 55.2, lon: 23.9, adversaries: ['RUS'] },
  { code: 'LUX', name: 'Luxembourg', lat: 49.8, lon: 6.1 },
  { code: 'MNE', name: 'Montenegro', lat: 42.7, lon: 19.3 },
  { code: 'MKD', name: 'North Macedonia', lat: 41.6, lon: 21.7 },
  { code: 'NOR', name: 'Norway', lat: 60.5, lon: 8.5, adversaries: ['RUS'] },
  { code: 'POL', name: 'Poland', lat: 52.0, lon: 19.1, allies: ['USA','GBR','FRA','DEU','UKR'], adversaries: ['RUS','BLR'] },
  { code: 'PRT', name: 'Portugal', lat: 39.4, lon: -8.2 },
  { code: 'ROU', name: 'Romania', lat: 45.9, lon: 24.9, adversaries: ['RUS'] },
  { code: 'SVK', name: 'Slovakia', lat: 48.7, lon: 19.7 },
  { code: 'SVN', name: 'Slovenia', lat: 46.1, lon: 14.8 },
  { code: 'ESP', name: 'Spain', lat: 40.5, lon: -3.7 },
  { code: 'SWE', name: 'Sweden', lat: 60.1, lon: 18.6, adversaries: ['RUS'] },
  { code: 'NLD', name: 'Netherlands', lat: 52.1, lon: 5.3 },
  { code: 'TUR', name: 'Turkey', lat: 39.0, lon: 35.2 },
  { code: 'GBR', name: 'United Kingdom', lat: 54.2, lon: -2.5, allies: ['USA','CAN','FRA','DEU','AUS','JPN','POL'], adversaries: ['RUS','IRN'] },
  { code: 'USA', name: 'United States', lat: 39.8, lon: -98.6, allies: ['CAN','GBR','FRA','DEU','JPN','KOR','AUS','POL','ITA','NLD'], adversaries: ['RUS','CHN','IRN','PRK'] },
  { code: 'UKR', name: 'Ukraine', lat: 49.0, lon: 31.4, allies: ['USA','GBR','FRA','DEU','POL'], adversaries: ['RUS','BLR'] },
  { code: 'RUS', name: 'Russia', lat: 61.5, lon: 105.3, allies: ['CHN','IRN','BLR'], adversaries: ['USA','GBR','FRA','DEU','POL','UKR','JPN'] },
  { code: 'CHN', name: 'China', lat: 35.9, lon: 104.2, allies: ['RUS','IRN','PRK'], adversaries: ['USA','JPN','IND','TWN'] },
  { code: 'JPN', name: 'Japan', lat: 36.2, lon: 138.3, allies: ['USA','GBR','AUS','KOR'], adversaries: ['CHN','RUS','PRK'] },
  { code: 'KOR', name: 'South Korea', lat: 36.5, lon: 127.8, allies: ['USA','JPN','AUS'], adversaries: ['PRK'] },
  { code: 'PRK', name: 'North Korea', lat: 40.3, lon: 127.5, allies: ['CHN','RUS'], adversaries: ['USA','KOR','JPN'] },
  { code: 'IND', name: 'India', lat: 20.6, lon: 78.9, allies: ['USA','FRA','JPN','AUS'], adversaries: ['CHN','PAK'] },
  { code: 'PAK', name: 'Pakistan', lat: 30.4, lon: 69.3, allies: ['CHN'], adversaries: ['IND'] },
  { code: 'IRN', name: 'Iran', lat: 32.4, lon: 53.7, allies: ['RUS','CHN'], adversaries: ['USA','ISR','SAU','GBR'] },
  { code: 'ISR', name: 'Israel', lat: 31.0, lon: 35.0, allies: ['USA','GBR','DEU'], adversaries: ['IRN'] },
  { code: 'SAU', name: 'Saudi Arabia', lat: 23.9, lon: 45.1, allies: ['USA','GBR'], adversaries: ['IRN'] },
  { code: 'AUS', name: 'Australia', lat: -25.3, lon: 133.8, allies: ['USA','GBR','JPN','KOR','IND'], adversaries: ['CHN'] },
  { code: 'BRA', name: 'Brazil', lat: -14.2, lon: -51.9, allies: ['USA','ARG'], adversaries: [] },
  { code: 'ZAF', name: 'South Africa', lat: -30.6, lon: 22.9, allies: ['BRA','IND'], adversaries: [] },
  { code: 'EGY', name: 'Egypt', lat: 26.8, lon: 30.8 },
  { code: 'ETH', name: 'Ethiopia', lat: 9.1, lon: 40.5 },
  { code: 'ARE', name: 'United Arab Emirates', lat: 24.3, lon: 54.4 },
  { code: 'IDN', name: 'Indonesia', lat: -2.5, lon: 118.0 },
];

const uniqueCodes = list => [...new Set((list || []).filter(Boolean))];
const DIPLOMACY_COUNTRIES = RAW_DIPLOMACY_COUNTRIES.map(country => {
  const blocs = [];
  if (NATO_MEMBER_CODES.includes(country.code)) blocs.push('NATO');
  if (BRICS_MEMBER_CODES.includes(country.code)) blocs.push('BRICS');
  const allies = country.code && NATO_MEMBER_CODES.includes(country.code)
    ? uniqueCodes([...(country.allies || []), ...NATO_MEMBER_CODES.filter(code => code !== country.code)])
    : uniqueCodes(country.allies || []);
  return {
    ...country,
    blocs,
    allies,
    bricsPartners: BRICS_MEMBER_CODES.includes(country.code)
      ? BRICS_MEMBER_CODES.filter(code => code !== country.code)
      : [],
  };
});
window.DIPLOMACY_DATA = DIPLOMACY_COUNTRIES;

const LAYERS = [
  { id: 'diplomacy',  label: 'DIPLOMACY',   sub: 'NATO · BRICS · ALLIES',        hotkey: '1' },
  { id: 'geographic', label: 'GEOGRAPHIC',  sub: 'BORDERS · CITIES · POI',        hotkey: '2' },
  { id: 'climate',    label: 'NATURE',      sub: 'EARTHQUAKES · STORMS · ALERTS', hotkey: '3' },
  { id: 'news',       label: 'NEWS',        sub: 'EVENTS · SOURCE CONFIDENCE',    hotkey: '4' },
  { id: 'infrastructure', label: 'INFRASTRUCTURE', sub: 'POWER GENERATION', hotkey: 'I' },
  { id: 'conflicts',  label: 'CONFLICTS',   sub: 'KINETIC · GRAY ZONE',           hotkey: '5' },
  { id: 'military',   label: 'MILITARY',    sub: 'BASES · NAVAL ASSETS',          hotkey: '6' },
  { id: 'logistics',  label: 'LOGISTICS',   sub: 'CONTAINER · OIL · LNG · TRUCK', hotkey: '7' },
  { id: 'flights',    label: 'FLIGHTS',     sub: 'ADS-B · ROUTES',                hotkey: '8' },
  { id: 'cyber',      label: 'CYBER',       sub: 'ATTACK VECTORS · ORIGINS',      hotkey: '9' },
  { id: 'dataCenters', label: 'DATA CENTERS', sub: 'CLOUD · COLO · CABLES', hotkey: '0' },
  { id: 'markets',    label: 'MARKETS',     sub: 'INDICES · METALS · CRYPTO',     hotkey: 'M' },
];

const FALLBACK_POWER_TYPES = {
  nuclear: { label: 'Nuclear', tag: 'NUC', color: '#ff4f76' },
  hydro: { label: 'Hydro', tag: 'HYD', color: '#46c7ff' },
  solar: { label: 'Solar', tag: 'SOL', color: '#ffd84d' },
  wind: { label: 'Wind', tag: 'WND', color: '#9be7ff' },
  coal: { label: 'Coal', tag: 'COL', color: '#ff8f3d' },
  gas: { label: 'Gas', tag: 'GAS', color: '#b38cff' },
  oil: { label: 'Oil', tag: 'OIL', color: '#f5b142' },
  geothermal: { label: 'Geothermal', tag: 'GEO', color: '#ff6f59' },
  biomass: { label: 'Biomass', tag: 'BIO', color: '#76d672' },
  waste: { label: 'Waste', tag: 'WST', color: '#c9d45b' },
  storage: { label: 'Storage', tag: 'BAT', color: '#5bd7ff' },
  cogeneration: { label: 'Cogeneration', tag: 'CHP', color: '#d9e4ef' },
  other: { label: 'Other', tag: 'OTH', color: '#aeb7c2' },
};
const POWER_TYPE_META = window.GLOBALDATA_POWER_TYPES || FALLBACK_POWER_TYPES;
const POWER_SUBLAYERS = Object.entries(POWER_TYPE_META).map(([id, meta]) => ({ id, ...meta }));
const DEFAULT_POWER_FILTERS = Object.fromEntries(POWER_SUBLAYERS.map(type => [type.id, true]));

function powerTypeKey(type) {
  const key = String(type || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
  if (key.includes('nuclear')) return 'nuclear';
  if (key.includes('hydro')) return 'hydro';
  if (key.includes('solar')) return 'solar';
  if (key.includes('wind')) return 'wind';
  if (key.includes('coal')) return 'coal';
  if (key.includes('gas')) return 'gas';
  if (key.includes('oil')) return 'oil';
  if (key.includes('geo')) return 'geothermal';
  if (key.includes('bio')) return 'biomass';
  if (key.includes('waste')) return 'waste';
  if (key.includes('storage') || key.includes('battery')) return 'storage';
  if (key.includes('cogen') || key.includes('chp')) return 'cogeneration';
  return key || 'other';
}

function powerMetaFor(type) {
  const key = powerTypeKey(type);
  const meta = POWER_TYPE_META[key] || {};
  return {
    key,
    label: meta.label || key.toUpperCase(),
    tag: meta.tag || key.slice(0, 3).toUpperCase(),
    color: meta.color || '#d9e4ef',
  };
}

function formatMw(value) {
  const mw = Number(value);
  return Number.isFinite(mw) ? `${Math.round(mw).toLocaleString()} MW` : '--';
}

function formatGwh(value) {
  const gwh = Number(value);
  return Number.isFinite(gwh) ? `${Math.round(gwh).toLocaleString()} GWh` : '--';
}

const MARKET_CONFIG = window.GLOBALDATA_MARKETS || { categories: [], refreshMs: 60000 };
const MARKET_CATEGORIES = MARKET_CONFIG.categories || [];
const MARKET_ITEMS = MARKET_CATEGORIES.flatMap(category =>
  (category.items || []).map(item => ({ ...item, categoryId: category.id, categoryLabel: category.label }))
);

function formatMarketNumber(value, type) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  const maximumFractionDigits = type === 'crypto' && number < 10 ? 4 : number >= 1000 ? 2 : 3;
  return number.toLocaleString(undefined, { maximumFractionDigits });
}

function formatMarketChange(value, pct) {
  const change = Number(value);
  const changePct = Number(pct);
  if (!Number.isFinite(change) || !Number.isFinite(changePct)) return '--';
  const sign = change > 0 ? '+' : '';
  return `${sign}${formatMarketNumber(change)} / ${sign}${changePct.toFixed(2)}%`;
}

function marketStatusFor(changePct) {
  const pct = Number(changePct);
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.05) return 'flat';
  return pct > 0 ? 'up' : 'down';
}

function sourceQuoteFor(item, quotes = {}) {
  const liveQuote = quotes[item.symbol];
  const quote = liveQuote?.ok ? liveQuote : item.fallback || liveQuote || {};
  const fallback = !liveQuote?.ok;
  const price = Number.isFinite(Number(quote.price)) ? Number(quote.price) : null;
  const previousClose = Number.isFinite(Number(quote.previousClose)) ? Number(quote.previousClose) : null;
  const change = Number.isFinite(Number(quote.change)) ? Number(quote.change)
    : price !== null && previousClose !== null ? price - previousClose : null;
  const changePct = Number.isFinite(Number(quote.changePct)) ? Number(quote.changePct)
    : change !== null && previousClose ? (change / previousClose) * 100 : null;
  return {
    ...item,
    ...quote,
    price,
    previousClose,
    change,
    changePct,
    fallback,
    status: marketStatusFor(changePct),
    sourceUrl: quote.sourceUrl || item.sourceUrl,
  };
}

function marketRowsFromQuotes(quotes = {}) {
  return MARKET_ITEMS.map(item => sourceQuoteFor(item, quotes));
}

async function fetchMarketQuotes(symbols) {
  const encoded = encodeURIComponent(symbols.join(','));
  const currentOrigin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : null;
  const candidates = [
    window.GLOBALDATA_API_BASE,
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? currentOrigin : null,
    'http://localhost:3000',
  ].filter(Boolean).map(base => `${String(base).replace(/\/$/, '')}/api/markets?symbols=${encoded}`);

  for (const url of [...new Set(candidates)]) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      // Try the next source.
    }
  }

  throw new Error('market API unavailable');
}

function useMarketData(active) {
  const [state, setState] = useState(() => ({
    status: 'REFERENCE',
    source: 'Static market snapshot',
    updatedAt: MARKET_CONFIG.generatedAt || null,
    quotes: {},
  }));

  useEffect(() => {
    if (!active || !MARKET_ITEMS.length) return undefined;
    let cancelled = false;
    const symbols = MARKET_ITEMS.map(item => item.symbol);

    const load = async () => {
      try {
        const payload = await fetchMarketQuotes(symbols);
        if (cancelled) return;
        const liveCount = Object.values(payload.quotes || {}).filter(quote => quote?.ok).length;
        setState({
          status: liveCount ? 'LIVE DELAYED' : 'REFERENCE',
          source: payload.source || 'Market data',
          updatedAt: payload.generatedAt || new Date().toISOString(),
          quotes: payload.quotes || {},
        });
      } catch (error) {
        if (!cancelled) {
          setState(current => ({
            ...current,
            status: 'REFERENCE',
            source: `Static market snapshot${error?.message ? ` / ${error.message}` : ''}`,
          }));
        }
      }
    };

    load();
    const interval = setInterval(load, MARKET_CONFIG.refreshMs || 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active]);

  return state;
}

// ============ SMALL UI BITS ============
function Toggle({ on, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 16, borderRadius: 2, position: 'relative', cursor: 'pointer',
        background: on ? color : 'transparent',
        border: `1px solid ${on ? color : 'var(--edge)'}`,
        transition: 'background .15s',
        padding: 0, flexShrink: 0,
      }}
      aria-pressed={on}
    >
      <span style={{
        position: 'absolute', top: 1, left: on ? 17 : 1,
        width: 12, height: 12, background: on ? '#000' : 'var(--text-dim)',
        transition: 'left .15s',
      }} />
    </button>
  );
}

function Slider({ value, onChange, color, disabled }) {
  return (
    <input
      type="range" min="0" max="100" value={Math.round(value * 100)}
      onChange={e => onChange(parseInt(e.target.value, 10) / 100)}
      disabled={disabled}
      className="opSlider"
      style={{ '--sc': color, opacity: disabled ? 0.3 : 1 }}
    />
  );
}

// ============ LAYER CONTROL ============
function PowerSublayerControls({ filters, active, onToggle }) {
  return (
    <div className="infra-subcontrols" aria-label="Infrastructure power generation sublayers">
      {POWER_SUBLAYERS.map(type => {
        const on = filters[type.id] !== false;
        return (
          <button
            key={type.id}
            type="button"
            className={`infra-subtoggle ${on ? 'on' : ''}`}
            style={{
              color: on ? type.color : 'var(--text-dim)',
              borderColor: on ? type.color : 'var(--edge)',
              opacity: active ? 1 : 0.55,
              background: on ? `${type.color}18` : 'transparent',
            }}
            onClick={() => onToggle(type.id)}
            aria-pressed={on}
            title={`${type.label} generation`}
          >
            <span>{type.tag}</span>
            <b>{type.label.toUpperCase()}</b>
          </button>
        );
      })}
    </div>
  );
}

function LayerRow({ layer, active, opacity, onToggle, onOpacity, color, sublayerContent }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`} data-layer-id={layer.id}>
      <div className="layer-head">
        <div className="layer-idx">{layer.hotkey}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="layer-label">{layer.label}</div>
          <div className="layer-sub">{layer.sub}</div>
        </div>
        <Toggle on={active} onClick={onToggle} color={color} />
      </div>
      <div className="layer-slider">
        <span className="sl-lbl">OPA</span>
        <Slider value={opacity} onChange={onOpacity} color={color} disabled={!active} />
        <span className="sl-val">{String(Math.round(opacity * 100)).padStart(3, '0')}</span>
      </div>
      {sublayerContent}
    </div>
  );
}

function DensityControl({ value, onChange, color }) {
  return (
    <div className="layer-row active">
      <div className="layer-head">
        <div className="layer-idx">D</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="layer-label">DENSITY</div>
          <div className="layer-sub">TRACKED OBJECT LIMIT</div>
        </div>
        <span className="sl-val">{String(Math.round(value * 100)).padStart(3, '0')}</span>
      </div>
      <div className="layer-slider">
        <span className="sl-lbl">OBJ</span>
        <Slider value={value} onChange={onChange} color={color} />
        <span className="sl-val">{objectLimitFromDensity(value)}</span>
      </div>
    </div>
  );
}

// ============ DTG CLOCK ============
function useDTG() {
  const [dtg, setDtg] = useState('');
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        month: 'short',
        year: '2-digit',
        hour12: false,
        timeZoneName: 'short',
      }).formatToParts(d).map(part => [part.type, part.value]));
      setDtg(`${parts.day}${parts.hour}${parts.minute}${parts.second}${parts.timeZoneName} ${parts.month.toUpperCase()}${parts.year}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return dtg;
}

// ============ TOP BAR ============
function TopBar({ theme, classification, layerCount, onResetView, rotating, onToggleRotate }) {
  const dtg = useDTG();
  return (
    <div className="top-bar">
      <div className="tb-left">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke={theme.accent} strokeWidth="1.2" />
            <ellipse cx="14" cy="14" rx="12" ry="5" fill="none" stroke={theme.accent} strokeWidth="0.8" opacity=".6" />
            <ellipse cx="14" cy="14" rx="5" ry="12" fill="none" stroke={theme.accent} strokeWidth="0.8" opacity=".6" />
            <line x1="2" y1="14" x2="26" y2="14" stroke={theme.accent} strokeWidth="0.6" opacity=".4" />
            <circle cx="14" cy="14" r="1.5" fill={theme.accent} />
          </svg>
          <div>
            <div className="logo-t">JEFRIX GLOBAL DATA ANALYSIS</div>
            <div className="logo-st">INTELLIGENCE BRIEFING SYSTEM / v1.0</div>
            <nav className="top-links" aria-label="Jefrix project links">
              <a href="https://jefrix.github.io/Fieldnotes/index.html">FIELDNOTES</a>
              <a href="https://jefrix.github.io/History-Timeline/">ALMANAC</a>
              <a data-fieldnotes-timeline-link="1" href="https://jefrix.github.io/History-Timeline/history-timeline.html">TIMELINE</a>
              <a href="https://jefrix.github.io/HQR/">HQR</a>
              <a data-collapse-signature-link="1" href="https://jefrix.github.io/collapse-signature-research/">CSR</a>
            </nav>
          </div>
        </div>
      </div>
      <div className="tb-center">
        <div className="class-banner" style={{ borderColor: theme.classification, color: theme.classification }}>
          {classification}
        </div>
      </div>
      <div className="tb-right">
        <div className="dtg">
          <div className="dtg-lbl">DTG</div>
          <div className="dtg-val">{dtg}</div>
        </div>
        <button className="iconbtn" onClick={onResetView} title="Reset view (R)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M2 7a5 5 0 1 0 1.5-3.5" /><path d="M2 3v3h3" />
          </svg>
          RESET
        </button>
        <button className={`iconbtn ${rotating ? 'on' : ''}`} onClick={onToggleRotate} title="Toggle globe rotation">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M2.2 5.5A4.8 4.8 0 0 1 10.5 3" />
            <path d="M10.5 3H7.7" />
            <path d="M11.8 8.5A4.8 4.8 0 0 1 3.5 11" />
            <path d="M3.5 11h2.8" />
          </svg>
          ROTATE
        </button>
        <div className="op-badge">OP <span>SENTINEL</span></div>
      </div>
    </div>
  );
}

// ============ BOTTOM STATUS ============
function BottomBar({ theme, stats, lat, lon, zoom, dataStatus }) {
  const liveLabel = dataStatus?.mode === 'live' ? 'LIVE DATA' : 'LIVE FALLBACK';
  return (
    <div className="bottom-bar">
      <div className="stat">
        <span className="st-lbl">LAYERS</span>
        <span className="st-val">{stats.activeLayers}/{LAYERS.length}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">FLIGHTS TRK</span>
        <span className="st-val">{stats.flights.toLocaleString()}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">VESSELS</span>
        <span className="st-val">{stats.vessels}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">MIL</span>
        <span className="st-val">{stats.military}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">NEWS EVT</span>
        <span className="st-val" style={{ color: theme.accentWarm }}>{stats.news}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">CYBER ACT</span>
        <span className="st-val" style={{ color: '#ff5c2e' }}>{stats.cyber}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">POWER GEN</span>
        <span className="st-val" style={{ color: '#ffd84d' }}>{stats.infrastructure}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">DATA CTR</span>
        <span className="st-val" style={{ color: '#5bd7ff' }}>{stats.dataCenters}</span>
      </div>
      <div className="stat">
        <span className="st-lbl">CONFLICTS</span>
        <span className="st-val" style={{ color: '#ff3040' }}>{stats.conflicts}</span>
      </div>
      <div className="spacer" />
      <div className="stat">
        <span className="st-lbl">CAM</span>
        <span className="st-val">{lat}° / {lon}°</span>
      </div>
      <div className="stat">
        <span className="st-lbl">ZOOM</span>
        <span className="st-val">{zoom}×</span>
      </div>
      <div className="stat blink">
        <span className="live-dot" /> {liveLabel}
      </div>
      <div className="stat">
        <span className="st-lbl">INGEST</span>
        <span className="st-val">{dataStatus?.summary || 'BOOT'}</span>
      </div>
    </div>
  );
}

// ============ RIGHT RAIL — EVENT TICKER ============
function infrastructurePayload(data) {
  const fallback = window.GLOBALDATA_INFRASTRUCTURE || {};
  return {
    cables: data?.infrastructureCables?.length ? data.infrastructureCables : fallback.cables || [],
    nodes: data?.infrastructureNodes?.length ? data.infrastructureNodes : fallback.nodes || [],
    powerPlants: data?.powerPlants?.length ? data.powerPlants
      : data?.infrastructurePowerPlants?.length ? data.infrastructurePowerPlants
        : fallback.powerPlants || [],
    events: [
      ...(fallback.events || []),
      ...(data?.infrastructureEvents || []),
    ],
  };
}

function cableFeedPoint(cable) {
  const path = cable?.pts || cable?.path || [];
  if (!Array.isArray(path) || !path.length) return {};
  const point = path[Math.floor(path.length / 2)] || path[0];
  if (Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))) {
    return { lat: Number(point[0]), lon: Number(point[1]) };
  }
  if (Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon))) {
    return { lat: Number(point.lat), lon: Number(point.lon) };
  }
  return {};
}

function dataCenterNetworkKind(node) {
  const type = String(node?.type || '').toLowerCase();
  if (type === 'cloud') return 'CLD';
  if (type === 'landing') return 'CAB';
  if (type === 'exchange') return 'IXP';
  if (type === 'hq') return 'HQ';
  return 'NET';
}

function dataCenterCableRecord(cable) {
  return {
    ...cable,
    ...cableFeedPoint(cable),
    type: cable?.type || 'subsea cable',
    city: cable?.city || cable?.region || cable?.name || 'Cable route',
    country: cable?.country || cable?.region || '--',
    operator: cable?.operator || cable?.owner || '--',
    status: cable?.status || 'Mapped cable route',
    source: cable?.source || 'GlobalData data center network layer',
  };
}

function EventFeed({ active, theme, data, densityValue, infraPowerTypes = DEFAULT_POWER_FILTERS, marketItems = [], onSelect, selectedId }) {
  const items = useMemo(() => {
    const D = data || window.MOCK_DATA;
    const feed = [];
    if (active.news) {
      D.news.slice(0, newsFeedLimitFromDensity(densityValue)).forEach(n => feed.push({
        id: n.id || n.url || n.title,
        t: n.ts, kind: 'NEWS', cat: n.category, city: n.city, country: n.country,
        title: n.title, meta: n.source || `${n.sources} SRC`,
        color: isTodayUtc(n.ts) ? '#e03535' : '#f5d142',
        inspectorKind: 'news',
        data: n,
      }));
    }
    if (active.climate) {
      (D.earthquakes || []).slice(0, 20).forEach(q => feed.push({
        id: q.id || q.url || q.title,
        t: q.ts, kind: 'QUAKE', cat: `M${q.mag || '?'}`,
        city: q.place || 'USGS', country: '--', title: q.title || q.place, meta: `M${q.mag || '?'}`,
        color: q.mag >= 5 ? '#ff7050' : '#f5b142',
        inspectorKind: 'earthquake',
        data: q,
      }));
      (D.weather || []).slice(0, 20).forEach(w => feed.push({
        id: w.id || w.url || w.title,
        t: w.ts, kind: 'WX', cat: w.severity,
        city: w.area || 'NWS', country: 'US', title: w.title, meta: w.severity || 'ALERT',
        color: '#a38bff',
        inspectorKind: 'weather',
        data: w,
      }));
    }
    if (active.cyber) {
      const cyberFeed = D.kasperskyCyber?.length ? D.kasperskyCyber : D.cyber;
      cyberFeed.slice(0, 15).forEach(c => feed.push({
        id: c.id || c.title,
        t: Date.now() - Math.random() * 3600000, kind: 'CYB', cat: c.severity,
        city: c.target.label, country: c.target.country || '--', title: `${c.type} -> ${c.target.label}`, meta: c.sourceName || c.severity,
        color: c.color || (c.severity === 'CRIT' ? '#ff3370' : c.severity === 'HIGH' ? '#ff5c2e' : '#f5a742'),
        inspectorKind: 'cyber',
        data: c,
      }));
    }
    if (active.markets) {
      marketItems.slice(0, 50).forEach((market, index) => feed.push({
        id: market.id || market.symbol,
        t: market.marketTime ? Date.parse(market.marketTime) : Date.now() - index * 30000,
        kind: market.type === 'crypto' ? 'COIN' : market.type === 'metal' ? 'MTL' : 'MKT',
        cat: market.status === 'up' ? 'UP' : market.status === 'down' ? 'DOWN' : 'FLAT',
        city: market.exchange || market.region || '--',
        country: market.region || market.currency || '--',
        title: market.label || market.name,
        meta: `${formatMarketNumber(market.price, market.type)} ${formatMarketChange(market.change, market.changePct)}`,
        color: market.status === 'up' ? '#73ff9a' : market.status === 'down' ? '#ff6f59' : '#ffd84d',
        inspectorKind: 'market',
        data: market,
      }));
    }
    if (active.infrastructure) {
      const infra = infrastructurePayload(D);
      infra.powerPlants
        .filter(plant => infraPowerTypes[powerTypeKey(plant.generationType || plant.primaryFuel || plant.primary_fuel || plant.fuel)] !== false)
        .slice(0, 80)
        .forEach((plant, index) => {
          const meta = powerMetaFor(plant.generationType || plant.primaryFuel || plant.primary_fuel || plant.fuel);
          feed.push({
            id: plant.id || plant.name,
            t: Date.now() - index * 45000,
            kind: meta.tag,
            cat: formatMw(plant.capacityMw || plant.capacity_mw),
            city: plant.county && plant.state ? `${plant.county}, ${plant.state}` : plant.state || plant.country || '--',
            country: plant.country || '--',
            title: plant.name,
            meta: `${meta.label} / ${formatMw(plant.capacityMw || plant.capacity_mw)}`,
            color: plant.color || meta.color,
            inspectorKind: 'powerPlant',
            data: plant,
          });
        });
    }
    if (active.dataCenters) {
      const infra = infrastructurePayload(D);
      (D.dataCenters || []).forEach((dc, index) => feed.push({
        id: dc.id || dc.name,
        t: Date.now() - index * 60000,
        kind: 'DC',
        cat: Number.isFinite(Number(dc.powerMw)) ? `${Math.round(Number(dc.powerMw))}MW` : 'UNDISC',
        city: dc.city || dc.region || '--',
        country: dc.country || '--',
        title: dc.name,
        meta: dc.operator || dc.owner || 'DATA CENTER',
        color: Number.isFinite(Number(dc.powerMw)) && Number(dc.powerMw) >= 200 ? '#5bd7ff' : '#73ff9a',
        inspectorKind: 'dataCenter',
        data: dc,
      }));
      infra.nodes.slice(0, 28).forEach((node, index) => feed.push({
        id: node.id || node.name,
        t: Date.now() - (index + 80) * 60000,
        kind: dataCenterNetworkKind(node),
        cat: String(node.type || 'NODE').toUpperCase(),
        city: node.city || node.name || '--',
        country: node.country || '--',
        title: node.name,
        meta: node.operator || node.type || 'DATA NETWORK',
        color: node.color || '#5bd7ff',
        inspectorKind: 'infrastructure',
        data: {
          ...node,
          source: node.source || 'GlobalData data center network layer',
        },
      }));
      infra.cables.slice(0, 18).forEach((cable, index) => {
        const record = dataCenterCableRecord(cable);
        feed.push({
          id: record.id || record.name,
          t: Date.now() - (index + 140) * 60000,
          kind: 'CAB',
          cat: 'ROUTE',
          city: record.city || record.name || 'Cable route',
          country: record.country || '--',
          title: record.name,
          meta: record.operator || record.owner || 'SUBSEA CABLE',
          color: record.color || '#9ad4ff',
          inspectorKind: 'infrastructure',
          data: record,
        });
      });
      infra.events.slice(0, 16).forEach((event, index) => feed.push({
        id: event.id || event.title,
        t: Date.now() - (index + 1000) * 45000,
        kind: 'NET',
        cat: event.severity || event.category || 'WATCH',
        city: event.city || event.name || 'Data network',
        country: event.country || '--',
        title: event.title,
        meta: event.sourceName || event.source || 'DATA NETWORK',
        color: /watch|risk|high|outage/i.test(event.severity || event.title || '') ? '#ff5c2e' : '#f5d142',
        inspectorKind: 'news',
        data: {
          ...event,
          category: event.category || 'DATA CENTER NETWORK',
          sourceName: event.sourceName || event.source || 'Data center network',
          ts: event.ts || Date.now(),
        },
      }));
    }
    if (active.conflicts) {
      (D.conflictEvents || []).slice(0, 20).forEach(c => feed.push({
        id: c.id || c.title,
        t: c.ts || Date.now(), kind: 'UCDP', cat: 'GED',
        city: c.country || '--', country: '--', title: c.title || 'Conflict event', meta: c.fatalities !== undefined ? `${c.fatalities} fatal` : 'GED',
        color: '#ff3040',
        inspectorKind: 'conflict',
        data: c,
      }));
      D.conflicts.slice(0, 14).forEach(c => feed.push({
        id: c.id || c.note,
        t: Date.now() - Math.random() * 7200000, kind: 'CFL', cat: c.level > 0.7 ? 'KIN' : 'GRAY',
        city: c.country, country: '--', title: c.note, meta: `L${Math.round(c.level * 10)}`,
        color: c.level > 0.7 ? '#ff3040' : c.level > 0.4 ? '#ff7050' : '#f5a742',
        inspectorKind: 'conflict',
        data: c,
      }));
    }
    if (active.military) {
      (D.militaryBases || []).slice(0, 25).forEach(b => feed.push({
        id: b.id || b.name,
        t: Date.now() - Math.random() * 3600000, kind: 'MIL', cat: b.function,
        city: b.country || '--', country: b.country || '--', title: b.name, meta: b.function || 'BASE',
        color: '#7bd6a8',
        inspectorKind: 'military',
        data: b,
      }));
      (D.militaryShips || []).slice(0, 15).forEach(s => feed.push({
        id: s.id || s.name,
        t: Date.now() - Math.random() * 3600000, kind: 'NAV', cat: s.function,
        city: s.country || '--', country: s.country || '--', title: s.name, meta: s.function || 'NAVAL',
        color: '#9ad4ff',
        inspectorKind: 'military',
        data: s,
      }));
      (D.vessels || []).filter(isMilitaryVesselRecord).slice(0, 12).forEach(s => feed.push({
        id: s.id || s.name,
        t: Date.now() - Math.random() * 3600000, kind: 'NAV', cat: s.function || s.type,
        city: s.country || '--', country: s.country || '--', title: s.name || s.id, meta: s.function || s.type || 'NAVAL',
        color: '#9ad4ff',
        inspectorKind: 'military',
        data: s,
      }));
    }
    if (active.logistics) {
      (D.vessels || []).filter(v => !isMilitaryVesselRecord(v)).slice(0, 18).forEach(v => feed.push({
        id: v.id || v.name,
        t: Date.now() - Math.random() * 1800000, kind: 'SHP', cat: v.type || 'VESSEL',
        city: v.laneName || v.region || 'SEA LANE', country: v.country || '--',
        title: v.name || v.id || 'Tracked vessel', meta: v.status || v.type || 'ACTIVE',
        color: v.type === 'oil' ? '#f5a742' : v.type === 'lng' ? '#9ad4ff' : '#7bd6a8',
        inspectorKind: 'vessel',
        data: v,
      }));
      (D.ports || []).slice(0, 16).forEach(p => feed.push({
        id: p.id || `${p.name}-${p.country}`,
        t: Date.now() - Math.random() * 3600000, kind: 'PRT', cat: p.traffic || 'PORT',
        city: p.name || p.city || 'Port', country: p.country || '--',
        title: p.name || p.city || 'Port', meta: p.status || p.traffic || 'OPEN',
        color: '#7bd6a8',
        inspectorKind: 'port',
        data: p,
      }));
    }
    if (active.flights) {
      D.flights.slice(0, 12).forEach(f => feed.push({
        id: f.id || f.callsign,
        t: Date.now() - Math.random() * 600000, kind: 'AVN', cat: 'RTE',
        city: f.country || f.dest?.name || 'ADS-B', country: f.country || f.dest?.country || '--',
        title: f.callsign || f.id, meta: f.alt ? `FL${Math.floor(f.alt/100)}` : 'ADS-B',
        color: theme.flight,
        inspectorKind: 'flight',
        data: f,
      }));
    }
    feed.sort((a, b) => b.t - a.t);
    return feed.slice(0, 60);
  }, [active, theme, data, densityValue, infraPowerTypes, marketItems]);

  const fmtT = (t) => {
    const diff = Math.floor((Date.now() - t) / 60000);
    if (diff < 1) return 'NOW';
    if (diff < 60) return `-${diff}M`;
    return `-${Math.floor(diff / 60)}H`;
  };

  return (
    <div className="feed">
      <div className="feed-head">
        <span>EVENT FEED</span>
        <span className="feed-count">{items.length} ITEMS</span>
      </div>
      <div className="feed-list">
        {items.length === 0 && (
          <div className="feed-empty">NO ACTIVE LAYERS<br/><span>TOGGLE A LAYER TO INGEST EVENTS</span></div>
        )}
        {items.map((it, i) => (
          <button
            key={`${it.kind}-${it.id || i}`}
            className={`feed-item clickable ${selectedId === it.id ? 'selected' : ''}`}
            onClick={() => onSelect?.({ kind: it.inspectorKind, data: it.data, eventId: it.id })}
            title="Show details in inspector"
          >
            <div className="feed-tag" style={{ color: it.color, borderColor: it.color }}>{it.kind}</div>
            <div className="feed-body">
              <div className="feed-title">{it.title}</div>
              <div className="feed-meta">
                <span>{it.city}</span>
                <span className="feed-dot">·</span>
                <span>{it.meta}</span>
                <span className="feed-time">{fmtT(it.t)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MarketBoard({ items, state, onSelect, selectedId }) {
  const grouped = MARKET_CATEGORIES.map(category => ({
    ...category,
    items: items.filter(item => item.categoryId === category.id),
  })).filter(category => category.items.length);
  const leaders = [...items]
    .filter(item => Number.isFinite(Number(item.changePct)))
    .sort((a, b) => Math.abs(Number(b.changePct)) - Math.abs(Number(a.changePct)))
    .slice(0, 4);

  return (
    <div className="market-board">
      <div className="market-head">
        <div>
          <div className="market-title">GLOBAL MARKETS</div>
          <div className="market-sub">INDICES / PRECIOUS METALS / CRYPTO</div>
        </div>
        <div className="market-status">
          <span>{state.status}</span>
          <b>{state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</b>
        </div>
      </div>
      <div className="market-leaders">
        {leaders.map(item => (
          <button
            key={`leader-${item.id}`}
            className={`market-chip ${item.status}`}
            onClick={() => onSelect?.({ kind: 'market', data: item, eventId: item.id })}
          >
            <span>{item.label}</span>
            <b>{formatMarketChange(item.change, item.changePct)}</b>
          </button>
        ))}
      </div>
      <div className="market-scroll">
        {grouped.map(category => (
          <section className="market-section" key={category.id}>
            <div className="market-section-hd">
              <span>{category.label}</span>
              <b>{category.items.length}</b>
            </div>
            <div className="market-grid">
              {category.items.map(item => (
                <button
                  key={item.id}
                  className={`market-card ${item.status} ${selectedId === item.id ? 'selected' : ''}`}
                  onClick={() => onSelect?.({ kind: 'market', data: item, eventId: item.id })}
                >
                  <div className="market-card-top">
                    <span>{item.label}</span>
                    <b>{item.currency || item.region || '--'}</b>
                  </div>
                  <div className="market-card-name">{item.name}</div>
                  <div className="market-price">{formatMarketNumber(item.price, item.type)}</div>
                  <div className="market-change">{formatMarketChange(item.change, item.changePct)}</div>
                  <div className="market-card-meta">
                    <span>{item.exchange || item.exchangeName || item.region}</span>
                    {item.fallback && <b>REF</b>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ============ INSPECTOR ============
function Row({ k, v, color }) {
  return <div className="insp-row"><span>{k}</span><b style={color ? { color } : null}>{v}</b></div>;
}
function Inspector({ pick, onClose, theme }) {
  if (!pick) return (
    <div className="inspector empty">
      <div className="insp-hd">INSPECTOR</div>
      <div className="insp-empty">SELECT A GLOBE OBJECT<br/><span>OR CLICK AN EVENT FEED ITEM</span></div>
    </div>
  );
  const { kind, data } = pick;
  return (
    <div className="inspector active">
      <div className="insp-hd">
        <span>{kind?.toUpperCase?.() || 'OBJECT'}</span>
        <button onClick={onClose}>×</button>
      </div>
      <div className="insp-body">
        {kind === 'city' && <CityDetail d={data} />}
        {kind === 'flight' && <FlightDetail d={data} />}
        {kind === 'vessel' && <VesselDetail d={data} />}
        {kind === 'port' && <PortDetail d={data} />}
        {kind === 'infrastructure' && <InfrastructureDetail d={data} />}
        {kind === 'powerPlant' && <PowerPlantDetail d={data} />}
        {kind === 'market' && <MarketDetail d={data} />}
        {kind === 'news' && <NewsDetail d={data} />}
        {kind === 'dataCenter' && <DataCenterDetail d={data} />}
        {kind === 'cyber' && <CyberDetail d={data} />}
        {kind === 'diplomacy' && <DiplomacyDetail d={data} />}
        {kind === 'military' && <MilitaryDetail d={data} />}
        {kind === 'storm' && <StormDetail d={data} />}
        {kind === 'conflict' && <ConflictDetail d={data} />}
        {kind === 'earthquake' && <EarthquakeDetail d={data} />}
        {kind === 'weather' && <WeatherDetail d={data} />}
      </div>
    </div>
  );
}
function CityDetail({ d }) {
  return (<>
    <div className="insp-title">{d.name}</div>
    <Row k="COUNTRY" v={d.country} /><Row k="POP" v={`${d.pop}M`} /><Row k="COORD" v={`${d.lat}, ${d.lon}`} />
  </>);
}
function PortDetail({ d }) {
  const port = enrichPort(d);
  return (<>
    <div className="insp-title" style={{ color: '#9ad4ff' }}>{port.name}</div>
    <Row k="COUNTRY" v={port.country || '--'} />
    <Row k="STATUS" v={port.status || '--'} color={String(port.status || '').toLowerCase().includes('closed') ? '#ff3040' : '#7bd6a8'} />
    <Row k="TRAFFIC" v={port.traffic || '--'} color={String(port.traffic || '').includes('high') ? '#f5b142' : '#7bd6a8'} />
    <Row k="SHIPS/DAY" v={port.shipsPerDay || '--'} />
    <Row k="ESTIMATE" v={port.trafficBasis || '--'} />
    <Row k="SOURCE" v={port.source || 'ports dataset'} />
  </>);
}
function InfrastructureDetail({ d }) {
  const location = [d.city || d.region || d.name || '--', d.country || null].filter(Boolean).join(', ');
  return (<>
    <div className="insp-title" style={{ color: '#5bd7ff' }}>{d.name}</div>
    <Row k="TYPE" v={String(d.type || 'NODE').toUpperCase()} color="#5bd7ff" />
    <Row k="LOCATION" v={location} />
    <Row k="OPERATOR" v={d.operator || '--'} />
    <Row k="TIER" v={d.tier ? `T${d.tier}` : '--'} />
    <Row k="STATUS" v={d.status || 'Mapped data network node'} />
    <Row k="SOURCE" v={d.source || 'GlobalData data center network layer'} />
  </>);
}
function PowerPlantDetail({ d }) {
  const meta = powerMetaFor(d.generationType || d.primaryFuel || d.primary_fuel || d.fuel);
  const source = d.sourceName || d.source || d.dataset || 'Public power plant dataset';
  return (<>
    <div className="insp-title" style={{ color: d.color || meta.color }}>{d.name}</div>
    <Row k="TYPE" v={meta.label.toUpperCase()} color={d.color || meta.color} />
    <Row k="CAPACITY" v={formatMw(d.capacityMw || d.capacity_mw)} color={d.color || meta.color} />
    <Row k="LOCATION" v={d.county && d.state ? `${d.county} County, ${d.state}` : d.state || d.country || '--'} />
    <Row k="COUNTRY" v={d.country || d.country_long || '--'} />
    <Row k="OWNER" v={d.owner || '--'} />
    <Row k="OPERATOR" v={d.operator || d.owner || '--'} />
    {d.generatorCount && <Row k="UNITS" v={d.generatorCount} />}
    <Row k="COMMISSION" v={d.commissioningYear || d.commissioning_year || '--'} />
    <Row k="GEN 2017" v={formatGwh(d.annualGenerationGwh ?? d.generation_gwh_2017)} />
    <Row k="DATA YEAR" v={d.sourceYear || d.year_of_capacity_data || 'see source'} />
    <Row k="DATASET" v={d.dataset || 'WRI Global Power Plant Database'} />
    <Row k="SOURCE" v={source} />
    {d.regulatorSource && <Row k="REGULATOR" v={d.regulatorSource} />}
    {d.sourceUrl && <div className="news-actions">
      <a className="news-link" href={d.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE</a>
      {d.regulatorUrl && <a className="news-link" href={d.regulatorUrl} target="_blank" rel="noreferrer">OPEN NRC</a>}
    </div>}
  </>);
}
function MarketDetail({ d }) {
  const color = d.status === 'up' ? '#73ff9a' : d.status === 'down' ? '#ff6f59' : '#ffd84d';
  return (<>
    <div className="insp-title" style={{ color }}>{d.label || d.symbol}</div>
    <Row k="NAME" v={d.name || '--'} />
    <Row k="SYMBOL" v={d.symbol || '--'} color={color} />
    <Row k="TYPE" v={String(d.type || 'market').toUpperCase()} />
    <Row k="PRICE" v={`${formatMarketNumber(d.price, d.type)} ${d.currency || ''}`.trim()} color={color} />
    <Row k="CHANGE" v={formatMarketChange(d.change, d.changePct)} color={color} />
    <Row k="PREV CLOSE" v={formatMarketNumber(d.previousClose, d.type)} />
    <Row k="DAY RANGE" v={`${formatMarketNumber(d.dayLow, d.type)} - ${formatMarketNumber(d.dayHigh, d.type)}`} />
    <Row k="EXCHANGE" v={d.exchangeName || d.exchange || '--'} />
    <Row k="REGION" v={d.region || '--'} />
    <Row k="UPDATED" v={d.marketTime ? new Date(d.marketTime).toLocaleString() : d.fallback ? 'Static snapshot' : '--'} />
    <Row k="SOURCE" v={d.fallback ? 'Static fallback / Yahoo Finance snapshot' : 'Yahoo Finance chart API'} />
    {d.sourceUrl && <div className="news-actions">
      <a className="news-link" href={d.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE</a>
    </div>}
  </>);
}
function FlightDetail({ d }) {
  const live = Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon));
  return (<>
    <div className="insp-title" style={{ color: '#ffd96e' }}>{d.callsign || d.id}</div>
    <Row k="TYPE" v={live ? 'LIVE ADS-B TRACK' : 'SCHEDULED ARC'} />
    <Row k="COUNTRY" v={d.country || '--'} />
    <Row k="ALT" v={d.alt ? `${Math.round(d.alt).toLocaleString()} ft` : '--'} />
    <Row k="SPEED" v={d.velocity ? `${Math.round(d.velocity)} kt` : '--'} />
    <Row k="SOURCE" v={d.source || 'Mock route'} />
  </>);
}
function VesselDetail({ d }) {
  return (<>
    <div className="insp-title" style={{ color: d.type === 'oil' ? '#f5a742' : d.type === 'lng' ? '#9ad4ff' : '#7bd6a8' }}>{d.name || d.id}</div>
    <Row k="TYPE" v={d.type?.toUpperCase()} />
    <Row k="STATUS" v={d.status || 'Underway'} />
    {d.flag && <Row k="FLAG" v={d.flag} />}
    {d.originCountry && <Row k="ORIGIN" v={d.originCountry} />}
    {d.destinationCountry && <Row k="DEST" v={d.destinationCountry} />}
    <Row k="LANE" v={`#${d.lane}`} />
    <Row k="SPD" v={`${Math.round((d.speed || 0) * 100000)} kt`} />
    <Row k="PROG" v={`${Math.round((d.progress || 0) * 100)}%`} />
    <Row k="SOURCE" v={d.source || 'Estimated from public shipping lanes'} />
  </>);
}
function NewsDetail({ d }) {
  const hot = isTodayUtc(d.ts);
  return (<>
    <div className="insp-title" style={{ color: hot ? '#e03535' : '#f5d142' }}>{d.title}</div>
    <Row k="CATEGORY" v={d.category} />
    <Row k="LOCATION" v={`${d.city}, ${d.country}`} />
    <Row k="SOURCE" v={d.sourceName || d.source || `${d.sources} reporting sources`} color={hot ? '#e03535' : '#f5d142'} />
    <Row k="AGE" v={`${Math.floor((Date.now() - d.ts) / 60000)} min ago`} />
    {d.url && <div className="news-actions">
      <a className="news-link" href={d.url} target="_blank" rel="noreferrer">OPEN ARTICLE</a>
    </div>}
  </>);
}
function DataCenterDetail({ d }) {
  const power = Number.isFinite(Number(d.powerMw)) ? `${Math.round(Number(d.powerMw)).toLocaleString()} MW` : null;
  const source = d.sourceName || d.source || 'Public source';
  return (<>
    <div className="insp-title" style={{ color: '#5bd7ff' }}>{d.name}</div>
    <Row k="OWNER" v={d.owner || '--'} />
    <Row k="OPERATOR" v={d.operator || d.owner || '--'} />
    <Row k="TYPE" v={d.type || '--'} />
    <Row k="LOCATION" v={`${d.city || '--'}, ${d.country || '--'}`} />
    <Row k="REGION" v={d.region || '--'} />
    <Row k="POWER" v={d.powerLabel || power || 'Not publicly disclosed'} color={power ? '#5bd7ff' : '#d9e4ef'} />
    <Row k="COMPUTE" v={d.computeCapacity || 'Not publicly disclosed'} />
    <Row k="FACILITY" v={d.facilitySize || '--'} />
    <Row k="NETWORK" v={d.network || '--'} />
    <Row k="STATUS" v={d.status || '--'} color="#73ff9a" />
    <Row k="SOURCE" v={source} />
    {d.sourceUrl && <div className="news-actions">
      <a className="news-link" href={d.sourceUrl} target="_blank" rel="noreferrer">OPEN SOURCE</a>
    </div>}
  </>);
}
function EarthquakeDetail({ d }) {
  const color = d.mag >= 5 ? '#ff7050' : '#f5b142';
  return (<>
    <div className="insp-title" style={{ color }}>{d.title || d.place}</div>
    <Row k="MAGNITUDE" v={`M${d.mag || '?'}`} color={color} />
    <Row k="PLACE" v={d.place || '--'} />
    <Row k="DEPTH" v={d.depth !== undefined ? `${d.depth} km` : '--'} />
    <Row k="SOURCE" v="USGS" />
    {d.url && <div className="news-actions"><a className="news-link" href={d.url} target="_blank" rel="noreferrer">OPEN USGS</a></div>}
  </>);
}
function WeatherDetail({ d }) {
  return (<>
    <div className="insp-title" style={{ color: '#a38bff' }}>{d.title}</div>
    <Row k="AREA" v={d.area || '--'} />
    <Row k="SEVERITY" v={d.severity || '--'} />
    <Row k="URGENCY" v={d.urgency || '--'} />
    <Row k="CERTAINTY" v={d.certainty || '--'} />
    {d.url && <div className="news-actions"><a className="news-link" href={d.url} target="_blank" rel="noreferrer">OPEN ALERT</a></div>}
  </>);
}
function CyberDetail({ d }) {
  const color = d.color || (d.severity === 'CRIT' ? '#ff3370' : d.severity === 'HIGH' ? '#ff5c2e' : '#f5a742');
  return (<>
    <div className="insp-title" style={{ color }}>{d.type} / {d.severity || d.sourceName || 'TRACE'}</div>
    <Row k="EVENT ID" v={d.id} />
    <Row k="ORIGIN" v={d.origin.label} />
    <Row k="TARGET" v={d.target.label} />
    <Row k="VECTOR" v={d.type} />
    <Row k="COUNT" v={d.count || '--'} color={color} />
    <Row k="SOURCE" v={d.sourceName || 'Mock cyber feed'} />
  </>);
}
function DiplomacyDetail({ d }) {
  return (<>
    <div className="insp-title">{d.name}</div>
    <Row k="COUNTRY" v={d.code} />
    <Row k="BLOCS" v={(d.blocs || []).join(', ') || '--'} color={(d.blocs || []).includes('BRICS') ? '#f5b142' : '#5aa8ff'} />
    <Row k="KNOWN ALLIES" v={(d.allies || []).join(', ') || '--'} color="#7bd6a8" />
    <Row k="BRICS PARTNERS" v={(d.bricsPartners || []).join(', ') || '--'} color="#f5b142" />
    <Row k="ADVERSARIES" v={(d.adversaries || []).join(', ') || '--'} color="#ff3040" />
  </>);
}
function MilitaryDetail({ d }) {
  return (<>
    <div className="insp-title">{d.name || d.id}</div>
    <Row k="COUNTRY" v={d.country || '--'} />
    <Row k="FUNCTION" v={d.function || d.type || '--'} />
    <Row k="REGION" v={d.region || '--'} />
    <Row k="COORD" v={`${Number(d.lat).toFixed(2)}, ${Number(d.lon).toFixed(2)}`} />
  </>);
}
function StormDetail({ d }) {
  return (<>
    <div className="insp-title">{d.id} · CAT {d.cat}</div>
    <Row k="TYPE" v={d.type.toUpperCase()} />
    <Row k="CENTER" v={`${d.lat}, ${d.lon}`} />
    <Row k="RADIUS" v={`~${d.radius}°`} />
  </>);
}
function ConflictDetail({ d }) {
  const color = d.level > 0.7 ? '#ff3040' : d.level > 0.4 ? '#ff7050' : '#f5a742';
  return (<>
    <div className="insp-title" style={{ color }}>{d.title || d.country}</div>
    <Row k="THREAT LVL" v={`${Math.round(d.level * 10)}/10`} color={color} />
    <Row k="STATUS" v={d.note || '--'} />
    {d.fatalities !== undefined && <Row k="FATALITIES" v={d.fatalities} />}
  </>);
}

// ============ TWEAKS ============
function TweaksPanel({ tweaks, setTweaks, theme }) {
  return (
    <div className="tweaks">
      <div className="tweaks-hd">TWEAKS</div>
      <div className="tweaks-body">
        <div className="tw-section">
          <div className="tw-lbl">THEME</div>
          <div className="tw-opts">
            {['tactical','situation','hud'].map(k => (
              <button key={k} className={`tw-opt ${tweaks.theme === k ? 'on' : ''}`} onClick={() => setTweaks({...tweaks, theme: k})}>
                {window.THEMES[k].name}
              </button>
            ))}
          </div>
        </div>
        <div className="tw-section">
          <div className="tw-lbl">DATA DENSITY</div>
          <div className="tw-opts">
            {['sparse','normal','dense'].map(k => (
              <button key={k} className={`tw-opt ${tweaks.density === k ? 'on' : ''}`} onClick={() => setTweaks({...tweaks, density: k})}>
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="tw-section">
          <div className="tw-lbl">PROJECTION</div>
          <div className="tw-opts">
            {[['wireframe','PURE WIRE'],['outlined','+OUTLINES'],['stipple','STIPPLE']].map(([k,l]) => (
              <button key={k} className={`tw-opt ${tweaks.projection === k ? 'on' : ''}`} onClick={() => setTweaks({...tweaks, projection: k})}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="tw-section">
          <div className="tw-row">
            <label><input type="checkbox" checked={tweaks.grid} onChange={e => setTweaks({...tweaks, grid: e.target.checked})} /> GRID</label>
            <label><input type="checkbox" checked={tweaks.labels} onChange={e => setTweaks({...tweaks, labels: e.target.checked})} /> LABELS</label>
            <label><input type="checkbox" checked={tweaks.spin} onChange={e => setTweaks({...tweaks, spin: e.target.checked})} /> AUTO-SPIN</label>
          </div>
        </div>
      </div>
    </div>
  );
}
function mergeLiveData(live) {
  const D = window.MOCK_DATA;
  if (!live) return D;
  const liveSources = live.sources || [];
  const hasLiveNewsSource = liveSources.some(source => source.name === 'news' && source.ok);

  return {
    ...D,
    flights: live.flights?.length ? live.flights : D.flights,
    news: hasLiveNewsSource ? (live.news || []) : D.news,
    SHIPPING: live.shippingLanes?.length ? live.shippingLanes.map(l => l.pts) : D.SHIPPING,
    shippingLanes: live.shippingLanes || [],
    ports: (live.ports?.length ? live.ports : D.ports || []).map(enrichPort),
    vessels: live.vessels?.length ? live.vessels : D.vessels,
    diplomacy: window.DIPLOMACY_DATA || [],
    militaryBases: live.militaryBases?.length ? live.militaryBases : D.militaryBases,
    militaryShips: live.militaryShips?.length ? live.militaryShips : D.militaryShips,
    conflictEvents: live.conflictEvents || [],
    aisstream: live.aisstream || [],
    kasperskyCyber: live.kasperskyCyber || [],
    earthquakes: live.earthquakes || [],
    weather: live.weather || [],
    dataCenters: D.dataCenters || [],
  };
}

function objectLimitFromDensity(value) {
  const t = Math.max(0, Math.min(1, Number(value) || 0));
  return Math.round(250 + t * 4750);
}

function newsFeedLimitFromDensity(value) {
  const t = Math.max(0, Math.min(1, Number(value) || 0));
  return Math.round(30 + t * 170);
}

function interpolateFeedPath(path, progress = 0) {
  if (!Array.isArray(path) || path.length < 2) return null;
  const t = ((Number(progress) || 0) % 1 + 1) % 1;
  const segmentCount = path.length - 1;
  const raw = t * segmentCount;
  const idx = Math.min(segmentCount - 1, Math.floor(raw));
  const local = raw - idx;
  const a = path[idx];
  const b = path[idx + 1];
  return {
    lat: Number(a[0]) + (Number(b[0]) - Number(a[0])) * local,
    lon: Number(a[1]) + (Number(b[1]) - Number(a[1])) * local,
  };
}

function focusPointForEvent(pick, data) {
  const d = pick?.data || {};
  if (Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon))) {
    return { lat: Number(d.lat), lon: Number(d.lon) };
  }
  if (pick?.kind === 'cyber') {
    const target = d.target || d.destination;
    if (Number.isFinite(Number(target?.lat)) && Number.isFinite(Number(target?.lon))) {
      return { lat: Number(target.lat), lon: Number(target.lon) };
    }
  }
  if (pick?.kind === 'conflict' && Array.isArray(d.bbox)) {
    const [south, west, north, east] = d.bbox.map(Number);
    if ([south, west, north, east].every(Number.isFinite)) {
      return { lat: (south + north) / 2, lon: (west + east) / 2 };
    }
  }
  if (pick?.kind === 'flight' && Number.isFinite(Number(d.origin?.lat)) && Number.isFinite(Number(d.dest?.lat))) {
    const progress = Number(d.progress) || 0;
    return {
      lat: Number(d.origin.lat) + (Number(d.dest.lat) - Number(d.origin.lat)) * progress,
      lon: Number(d.origin.lon) + (Number(d.dest.lon) - Number(d.origin.lon)) * progress,
    };
  }
  if (Number.isFinite(Number(d.lane))) {
    const path = (data?.SHIPPING || window.MOCK_DATA?.SHIPPING || [])[Number(d.lane)];
    return interpolateFeedPath(path, d.progress);
  }
  return null;
}

const PORT_TRAFFIC_PROFILES = [
  { match: /shanghai/i, traffic: 'very high traffic', ships: '>35 ship calls/day', basis: '2024 top global container port; ~51.5M TEU/year reported' },
  { match: /singapore/i, traffic: 'very high traffic', ships: '>30 ship calls/day', basis: '2024 top global container port; ~41M TEU/year reported' },
  { match: /ningbo|zhoushan/i, traffic: 'very high traffic', ships: '>30 ship calls/day', basis: '2024 top global container port; ~39M TEU/year reported' },
  { match: /shenzhen/i, traffic: 'very high traffic', ships: '>25 ship calls/day', basis: '2024 top global container port; ~33M TEU/year reported' },
  { match: /qingdao/i, traffic: 'very high traffic', ships: '>25 ship calls/day', basis: '2024 top global container port; ~31M TEU/year reported' },
  { match: /guangzhou|nansha/i, traffic: 'very high traffic', ships: '>20 ship calls/day', basis: '2024 top global container port; ~26M TEU/year reported' },
  { match: /busan/i, traffic: 'very high traffic', ships: '>20 ship calls/day', basis: '2024 top global container port; ~24M TEU/year reported' },
  { match: /tianjin/i, traffic: 'very high traffic', ships: '>20 ship calls/day', basis: '2024 top global container port; ~23M TEU/year reported' },
  { match: /jebel ali|dubai/i, traffic: 'very high traffic', ships: '>12 ship calls/day', basis: '2024 top global container port; ~15.5M TEU/year reported' },
  { match: /port klang|klang/i, traffic: 'very high traffic', ships: '>10 ship calls/day', basis: '2024 top global container port; ~14.6M TEU/year reported' },
  { match: /rotterdam/i, traffic: 'very high traffic', ships: '>12 ship calls/day', basis: 'major European gateway; 2024 annual throughput 435.8M tonnes reported by port authority' },
  { match: /los angeles|long beach|new york|new jersey|antwerp|hamburg|savannah|houston|santos|felixstowe/i, traffic: 'high traffic', ships: '8-20 ship calls/day', basis: 'major regional gateway estimate' },
  { match: /panama|suez|gibraltar|malacca|colombo|piraeus|valencia|algeciras|durban|tanger/i, traffic: 'high traffic', ships: '6-18 ship calls/day', basis: 'major chokepoint or transshipment estimate' },
];

function enrichPort(port, index = 0) {
  const label = `${port?.name || ''} ${port?.city || ''} ${port?.country || ''}`;
  const profile = PORT_TRAFFIC_PROFILES.find(item => item.match.test(label));
  const fallbackTraffic = index < 120 ? 'moderate traffic' : 'low traffic';
  return {
    ...port,
    name: port?.name || port?.city || 'Port',
    country: port?.country || '--',
    status: port?.status || 'Open / no public closure flag',
    traffic: port?.traffic || profile?.traffic || fallbackTraffic,
    shipsPerDay: port?.shipsPerDay || profile?.shipsPerDay || (index < 120 ? '2-8 ship calls/day' : '<2 ship calls/day'),
    trafficBasis: port?.trafficBasis || profile?.basis || 'estimated from global shipping lane density and port dataset rank',
  };
}

function isMilitaryVesselRecord(vessel) {
  const text = [vessel?.type, vessel?.function, vessel?.country, vessel?.name, vessel?.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\b(military|naval|navy|carrier|patrol|surface group|task group)\b/.test(text);
}

function selectionColorForEvent(pick) {
  if (pick?.kind === 'powerPlant') {
    return powerMetaFor(pick.data?.generationType || pick.data?.primaryFuel || pick.data?.primary_fuel || pick.data?.fuel).color;
  }
  if (pick?.kind === 'infrastructure') return '#5bd7ff';
  if (pick?.kind === 'dataCenter') return '#5bd7ff';
  return '#73ff9a';
}

function normalizeTweaks(tweaks, defaults) {
  const next = { ...defaults, ...(tweaks || {}) };
  if (String(next.classification || '').toUpperCase().includes('SIMULATION')) {
    next.classification = defaults.classification;
  }
  return next;
}

async function fetchLiveData(flightLimit, objectLimit) {
  const currentOrigin = window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : null;
  const candidates = [
    window.GLOBALDATA_API_BASE,
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? currentOrigin : null,
    'http://localhost:3009',
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean);
  const uniqueCandidates = [...new Set(candidates.map(base => base.replace(/\/$/, '')))];
  let lastError = null;

  for (const base of uniqueCandidates) {
    try {
      const response = await fetch(`${base}/api/live?limit=${flightLimit}&objects=${objectLimit}`);
      if (!response.ok) throw new Error(`${base} HTTP ${response.status}`);
      const live = await response.json();
      return { live, base };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No live API endpoint available');
}

const LIVE_FLIGHT_LIMITS = {
  sparse: 750,
  normal: 2500,
  dense: 5000,
};

function useLiveData(density = 'normal', densityValue = 0.5) {
  const [state, setState] = React.useState({
    data: { ...window.MOCK_DATA, diplomacy: window.DIPLOMACY_DATA || [] },
    status: { mode: 'fallback', summary: 'BOOT' },
  });

  React.useEffect(() => {
    const objectLimit = objectLimitFromDensity(densityValue);
    const flightLimit = Math.min(objectLimit, LIVE_FLIGHT_LIMITS[density] || LIVE_FLIGHT_LIMITS.normal);
    const load = async () => {
      try {
        const { live, base } = await fetchLiveData(flightLimit, objectLimit);
        const data = mergeLiveData(live);
        const ok = (live.sources || []).filter(s => s.ok);
        setState({
          data,
          status: {
            mode: ok.length ? 'live' : 'fallback',
            summary: `${base.replace(/^https?:\/\//, '')} ${(live.sources || []).map(s => `${s.name}:${s.count}`).join(' ')}`,
            sources: live.sources || [],
          },
        });
      } catch (error) {
        setState({
          data: { ...window.MOCK_DATA, diplomacy: window.DIPLOMACY_DATA || [] },
          status: { mode: 'fallback', summary: 'API OFFLINE', error: error.message },
        });
      }
    };

    load();
    const interval = setInterval(load, 30000);

    return () => clearInterval(interval);
  }, [density, densityValue]);

  return state;
}
// ============ MAIN APP ============
function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "tactical",
    "density": "normal",
    "projection": "outlined",
    "grid": true,
    "labels": true,
    "spin": true,
    "classification": "UNCLASSIFIED // LIVE DATA"
  }/*EDITMODE-END*/;

  const [tweaks, setTweaks] = useState(() => {
    try { return normalizeTweaks(JSON.parse(localStorage.getItem('gd_tweaks')), TWEAK_DEFAULTS); }
    catch { return normalizeTweaks(null, TWEAK_DEFAULTS); }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [active, setActive] = useState(() => {
    const a = {}; LAYERS.forEach(l => a[l.id] = false); return a;
  });
  const [opacity, setOpacity] = useState(() => {
    const a = {}; LAYERS.forEach(l => a[l.id] = 1); return a;
  });
  const [infraPowerTypes, setInfraPowerTypes] = useState(() => {
    try {
      return { ...DEFAULT_POWER_FILTERS, ...(JSON.parse(localStorage.getItem('gd_infra_power_types')) || {}) };
    } catch {
      return { ...DEFAULT_POWER_FILTERS };
    }
  });
  const [densityValue, setDensityValue] = useState(() => {
    const saved = Number(localStorage.getItem('gd_density_limit'));
    return Number.isFinite(saved) ? saved : 0.5;
  });
  const [pick, setPick] = useState(null);
  const [railPick, setRailPick] = useState(null);
  const [rotating, setRotating] = useState(() => Boolean(tweaks.spin));
  const [camInfo, setCamInfo] = useState({ lat: 0, lon: 0, zoom: '1.0' });
  const globeRef = useRef(null);
  const engineRef = useRef(null);
  const theme = window.THEMES[tweaks.theme];
  const { data, status: dataStatus } = useLiveData(tweaks.density, densityValue);
  const marketState = useMarketData(active.markets);
  const marketItems = useMemo(() => marketRowsFromQuotes(marketState.quotes), [marketState.quotes]);
  useEffect(() => { localStorage.setItem('gd_tweaks', JSON.stringify(tweaks)); }, [tweaks]);
  useEffect(() => { localStorage.setItem('gd_infra_power_types', JSON.stringify(infraPowerTypes)); }, [infraPowerTypes]);
  useEffect(() => { localStorage.setItem('gd_density_limit', String(densityValue)); }, [densityValue]);

useEffect(() => {
  const e = window.GlobeEngine.create(globeRef.current, theme);
  e.buildAll?.();
  e.onPick?.(p => {
    setPick(p);
    if (p?.kind === 'diplomacy') e.selectDiplomacyCountry?.(p.data.code);
  });
  engineRef.current = e;

  const id = setInterval(() => {
    if (!engineRef.current || engineRef.current._stopped) return;
    const eng = engineRef.current;
    const lat = Math.round(-eng.rotationX * 180 / Math.PI * 100) / 100;
    const lon = Math.round(((-90 - eng.rotationY * 180 / Math.PI) % 360 + 540) % 360 - 180);
    setCamInfo({ lat, lon, zoom: (320 / eng.currentZ).toFixed(2) });
  }, 250);
  
  return () => {
    clearInterval(id);
    e.dispose?.();
    engineRef.current = null;
  };
}, []);


  React.useEffect(() => {
    if (!engineRef.current) return;
    const objectLimit = objectLimitFromDensity(densityValue);
    engineRef.current.maxTrackedObjects = objectLimit;
    engineRef.current.maxFlightMarkers = Math.min(objectLimit, LIVE_FLIGHT_LIMITS[tweaks.density] || LIVE_FLIGHT_LIMITS.normal);
    engineRef.current.updateLiveData?.(data);
    engineRef.current.updateFlights?.(data.flights || []);
  }, [data, tweaks.density, densityValue]);
  // Apply layer visibility / opacity
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    LAYERS.forEach(l => {
  if (e.setLayerVisible) {
    e.setLayerVisible(l.id, active[l.id]);
  }

  if (e.setLayerOpacity) {
    e.setLayerOpacity(l.id, opacity[l.id]);
  }
});
  }, [active, opacity]);

  useEffect(() => {
    window.GlobalDataInfrastructureFilters = { powerTypes: infraPowerTypes };
    if (engineRef.current?.setInfrastructurePowerFilters) {
      engineRef.current.setInfrastructurePowerFilters(infraPowerTypes);
    } else {
      window.dispatchEvent(new CustomEvent('globaldata:infrastructure-filter-change', {
        detail: { powerTypes: infraPowerTypes },
      }));
    }
  }, [infraPowerTypes]);

  // Grid / labels / projection / spin
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    e.setGridVisible?.(tweaks.grid);
    if (e.landmasses) e.landmasses.visible = tweaks.projection !== 'wireframe';
    e.autoSpin = rotating;
  }, [tweaks, rotating]);

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const l = LAYERS.find(layer => String(layer.hotkey).toLowerCase() === String(e.key).toLowerCase());
      if (l) {
        setActive(a => ({ ...a, [l.id]: !a[l.id] }));
      }
      if (e.key === 'r' || e.key === 'R') engineRef.current?.resetView();
      if (e.key === '+' || e.key === '=') engineRef.current?.zoomBy(0.85);
      if (e.key === '-' || e.key === '_') engineRef.current?.zoomBy(1.18);
      if (e.key === 't' || e.key === 'T') setTweaksOpen(o => !o);
      if (e.key === 'Escape') setPick(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Edit-mode protocol
  useEffect(() => {
    const listener = (ev) => {
      const d = ev.data || {};
      if (d.type === '__activate_edit_mode') setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', listener);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', listener);
  }, []);
  useEffect(() => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: tweaks }, '*');
  }, [tweaks]);

  // Stats
  const stats = useMemo(() => {
    const D = data || window.MOCK_DATA;
    const infra = infrastructurePayload(D);
    return {
      activeLayers: Object.values(active).filter(Boolean).length,
      flights: active.flights ? D.flights.length : 0,
      vessels: active.logistics ? (D.vessels || []).filter(v => !isMilitaryVesselRecord(v)).length : 0,
      military: active.military
        ? (D.militaryBases?.length || 0) + (D.militaryShips?.length || 0) + (D.vessels || []).filter(isMilitaryVesselRecord).length
        : 0,
      news: active.news ? D.news.length : 0,
      cyber: active.cyber ? (D.kasperskyCyber?.length || D.cyber.length) : 0,
      dataCenters: active.dataCenters ? (D.dataCenters?.length || 0) + infra.nodes.length + infra.cables.length : 0,
      markets: active.markets ? marketItems.length : 0,
      infrastructure: active.infrastructure ? infra.powerPlants
        .filter(plant => infraPowerTypes[powerTypeKey(plant.generationType || plant.primaryFuel || plant.primary_fuel || plant.fuel)] !== false)
        .length : 0,
      conflicts: active.conflicts ? D.conflicts.length + (D.conflictEvents?.length || 0) : 0,
    };
  }, [active, data, infraPowerTypes, marketItems.length]);

  const colorFor = (id) => {
    const m = {
      diplomacy: '#7bd6a8', geographic: theme.city, climate: theme.storm,
      news: '#f58a42', logistics: theme.lane, flights: theme.flight,
      cyber: '#ff5c2e', military: '#7bd6a8', conflicts: '#ff3040', dataCenters: '#5bd7ff', infrastructure: '#ffd84d', markets: '#73ff9a',
    };
    return m[id] || theme.accent;
  };

  const selectFeedEvent = React.useCallback((eventPick) => {
    setRailPick(eventPick);
    const point = focusPointForEvent(eventPick, data);
    if (point && engineRef.current?.highlightPoint) {
      engineRef.current.highlightPoint(point.lat, point.lon, selectionColorForEvent(eventPick));
    }
  }, [data]);

  const clearRailSelection = React.useCallback(() => {
    setRailPick(null);
    engineRef.current?.clearSelectionHighlight?.();
  }, []);

  const toggleInfraPowerType = React.useCallback(typeId => {
    setInfraPowerTypes(current => ({ ...current, [typeId]: current[typeId] === false }));
  }, []);

  // Theme CSS vars
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--bg1', theme.bg1);
    r.setProperty('--bg2', theme.bg2);
    r.setProperty('--panel', theme.panel);
    r.setProperty('--edge', theme.panelEdge);
    r.setProperty('--text', theme.text);
    r.setProperty('--text-dim', theme.textDim);
    r.setProperty('--accent', theme.accent);
    r.setProperty('--accent-warm', theme.accentWarm);
    r.setProperty('--classif', theme.classification);
  }, [theme]);

  // Rebuild engine if theme actually changes colors — simplest is to reload layers with new materials
 useEffect(() => {
  if (!engineRef.current) return;
  const e = engineRef.current;
  e.theme = theme;
  
  // Dispose before rebuilding (prevents Leak F)
  const dispose = window.GlobeEnginePerfFix?.disposeMesh;
  if (dispose) {
    [e.grid, e.landmasses, e.glowMesh, e.depthMaskMesh, e.coreMesh].forEach(dispose);
  }
  
  e.root.remove(e.grid);
  e.root.remove(e.landmasses);
  e.scene.remove(e.glowMesh);
  e.root.remove(e.depthMaskMesh);
  e.root.remove(e.coreMesh);
  e._buildGlow?.();
  e._buildCore?.();
  e._buildGrid?.();
  e._buildLandmasses?.();
  if (e.landmasses) e.landmasses.visible = tweaks.projection !== 'wireframe';
  LAYERS.forEach(l => {
    if (e.setLayerVisible) e.setLayerVisible(l.id, active[l.id]);
    if (e.setLayerOpacity) e.setLayerOpacity(l.id, opacity[l.id]);
  });
}, [tweaks.theme]);
  return (
    <div className="app">
      <TopBar
        theme={theme}
        classification={tweaks.classification}
        layerCount={stats.activeLayers}
        onResetView={() => engineRef.current?.resetView()}
        rotating={rotating}
        onToggleRotate={() => setRotating(on => {
          const next = !on;
          if (engineRef.current) engineRef.current.autoSpin = next;
          setTweaks(t => ({ ...t, spin: next }));
          return next;
        })}
      />
      <div className="main">
        {/* LEFT RAIL */}
        <aside className="rail-left">
          <div className="rail-hd">
            <span>DATA LAYERS</span>
            <span className="rail-hd-count">{stats.activeLayers} ON</span>
          </div>
          <div className="layers">
            <DensityControl
              value={densityValue}
              onChange={setDensityValue}
              color={theme.accent}
            />
            {LAYERS.map(l => (
              <LayerRow
                key={l.id}
                layer={l}
                active={active[l.id]}
                opacity={opacity[l.id]}
                color={colorFor(l.id)}
                onToggle={() => setActive(a => ({ ...a, [l.id]: !a[l.id] }))}
                onOpacity={v => setOpacity(o => ({ ...o, [l.id]: v }))}
                sublayerContent={l.id === 'infrastructure' ? (
                  <PowerSublayerControls
                    filters={infraPowerTypes}
                    active={active.infrastructure}
                    onToggle={toggleInfraPowerType}
                  />
                ) : null}
              />
            ))}
          </div>
          <div className="rail-ft">
            <button className="rail-btn" onClick={() => {
              const allOn = LAYERS.every(l => active[l.id]);
              const next = {}; LAYERS.forEach(l => next[l.id] = !allOn);
              setActive(next);
            }}>
              {LAYERS.every(l => active[l.id]) ? 'CLEAR ALL' : 'ALL LAYERS'}
            </button>
            <div className="legend">
              <div className="legend-hd">HEAT SCALE · NEWS SOURCES</div>
              <div className="legend-bar">
                <div className="lg-seg" style={{background:'#f5d142'}} />
                <div className="lg-seg" style={{background:'#f58a42'}} />
                <div className="lg-seg" style={{background:'#e03535'}} />
              </div>
              <div className="legend-ticks">
                <span>1</span><span>15</span><span>30</span><span>50+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* GLOBE */}
        <div className={`globe-wrap ${active.markets ? 'market-mode' : ''}`}>
          <div ref={globeRef} className={`globe ${active.markets ? 'hidden-globe' : ''}`} />
          {active.markets && (
            <MarketBoard
              items={marketItems}
              state={marketState}
              selectedId={railPick?.eventId || null}
              onSelect={selectFeedEvent}
            />
          )}
          {/* Corner crosshairs */}
          {!active.markets && <div className="xh xh-tl"><span/><span/></div>}
          {!active.markets && <div className="xh xh-tr"><span/><span/></div>}
          {!active.markets && <div className="xh xh-bl"><span/><span/></div>}
          {!active.markets && <div className="xh xh-br"><span/><span/></div>}

          {/* Zoom controls */}
          {!active.markets && <div className="zoom-controls">
            <button onClick={() => engineRef.current?.zoomBy(0.85)}>+</button>
            <div className="zoom-rail">
              <div className="zoom-tick" style={{top: `${Math.max(0, Math.min(100, (1 - (parseFloat(camInfo.zoom) - 0.57) / 2.29) * 100))}%`}} />
            </div>
            <button onClick={() => engineRef.current?.zoomBy(1.18)}>−</button>
          </div>}

          {/* Bearing indicator */}
          {!active.markets && <div className="bearing">
            <svg width="60" height="60" viewBox="-30 -30 60 60">
              <circle r="28" fill="none" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
              <circle r="22" fill="none" stroke="currentColor" strokeWidth="0.5" opacity=".3" strokeDasharray="2 2" />
              <g transform={`rotate(${-camInfo.lon})`}>
                <path d="M0 -26 L3 -20 L0 -22 L-3 -20 Z" fill={theme.accent} />
              </g>
              <text x="0" y="-16" textAnchor="middle" fontSize="6" fill="currentColor">N</text>
            </svg>
          </div>}

          {/* Scanline overlay */}
          <div className="scanlines" />

          {/* Inspector (only when something picked) */}
          {pick && !active.markets && <div className="picked-wrap"><Inspector pick={pick} onClose={() => setPick(null)} theme={theme} /></div>}
        </div>

        {/* RIGHT RAIL — FEED + EMPTY INSPECTOR */}
        <aside className="rail-right">
          <Inspector pick={railPick} onClose={clearRailSelection} theme={theme} />
          <EventFeed
            active={active}
            theme={theme}
            data={data}
            densityValue={densityValue}
            infraPowerTypes={infraPowerTypes}
            marketItems={marketItems}
            selectedId={railPick?.eventId || null}
            onSelect={selectFeedEvent}
          />
        </aside>
      </div>
      <BottomBar theme={theme} stats={stats} lat={camInfo.lat} lon={camInfo.lon} zoom={camInfo.zoom} dataStatus={dataStatus} />

      {tweaksOpen && (
        <div className="tweaks-overlay" onClick={() => setTweaksOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} theme={theme} />
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
