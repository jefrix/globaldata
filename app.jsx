// UI shell — React components for the dashboard chrome.
// Depends on window.GlobeEngine, window.MOCK_DATA, window.COASTLINES, window.THEMES

const { useState, useEffect, useRef, useMemo } = React;

// ============ THEMES ============
window.THEMES = {
  tactical: {
    name: "TACTICAL",
    bg1: "#050b17", bg2: "#08142a", panel: "#0a1930", panelEdge: "#1a3153",
    text: "#cfe2ff", textDim: "#7a94b8", accent: "#3b8df5", accentWarm: "#f5b142",
    classification: "#f5b142",
    // Globe
    glow: "#1a4d8f", core: "#061528", grid: "#1e4f86", gridStrong: "#3b8df5",
    land: "#5ea9ff",
    river: "#4bc6e8", mountain: "#d4b16a",
    city: "#ffffff",
    storm: "#a38bff", stormHi: "#d85cff", wind: "#6cc1d8",
    lane: "#7bd6a8", container: "#7bd6a8", oil: "#f5a742", lng: "#9ad4ff", truck: "#7bd6a8",
    flight: "#ffd96e", flightLine: "#ffd96e",
    satLeo: "#6ee7f5", satMeo: "#a9b9ff", satGeo: "#ff8fcf",
  },
  situation: {
    name: "SITUATION ROOM",
    bg1: "#0d0a07", bg2: "#14100b", panel: "#1a1510", panelEdge: "#3a2f22",
    text: "#ffe8c7", textDim: "#a08766", accent: "#f59431", accentWarm: "#f59431",
    classification: "#f59431",
    glow: "#7a3e10", core: "#0a0804", grid: "#4a3420", gridStrong: "#8a5a28",
    land: "#e6a964",
    river: "#8cb8c8", mountain: "#d88836",
    city: "#ffe6b8",
    storm: "#ff7a3a", stormHi: "#ff3a3a", wind: "#a8a290",
    lane: "#c8a060", container: "#c8a060", oil: "#ff8f38", lng: "#e6cc90", truck: "#c8a060",
    flight: "#ffd080", flightLine: "#ffd080",
    satLeo: "#d8c88a", satMeo: "#e0a060", satGeo: "#ff7050",
  },
  hud: {
    name: "HUD",
    bg1: "#020a0c", bg2: "#02141a", panel: "#03151b", panelEdge: "#0c4152",
    text: "#d4fbff", textDim: "#5d8a95", accent: "#1de8f0", accentWarm: "#f5e342",
    classification: "#1de8f0",
    glow: "#0a9fb8", core: "#021418", grid: "#1b6b7a", gridStrong: "#1de8f0",
    land: "#4fe8f0",
    river: "#70e8d4", mountain: "#b8f0a0",
    city: "#ffffff",
    storm: "#f058ff", stormHi: "#ff4080", wind: "#6cd8b8",
    lane: "#1de8f0", container: "#1de8f0", oil: "#ffb040", lng: "#c8f0ff", truck: "#1de8f0",
    flight: "#f5e342", flightLine: "#f5e342",
    satLeo: "#70e8ff", satMeo: "#a8a0ff", satGeo: "#ff70d4",
  },
};

// ============ LAYER DEFINITIONS ============
const LAYERS = [
  { id: 'geologic',   label: 'GEOLOGIC',    sub: 'TOPO · HYDRO · OROGRAPHY',     hotkey: '1' },
  { id: 'geographic', label: 'GEOGRAPHIC',  sub: 'BORDERS · CITIES · POI',        hotkey: '2' },
  { id: 'climate',    label: 'CLIMATE',     sub: 'WIND · RADAR · STORMS',         hotkey: '3' },
  { id: 'news',       label: 'NEWS',        sub: 'EVENTS · SOURCE CONFIDENCE',    hotkey: '4' },
  { id: 'logistics',  label: 'LOGISTICS',   sub: 'CONTAINER · OIL · LNG · TRUCK', hotkey: '5' },
  { id: 'flights',    label: 'FLIGHTS',     sub: 'ADS-B · ROUTES',                hotkey: '6' },
  { id: 'cyber',      label: 'CYBER',       sub: 'ATTACK VECTORS · ORIGINS',      hotkey: '7' },
  { id: 'satellites', label: 'SATELLITES',  sub: 'LEO · MEO · GEO',               hotkey: '8' },
  { id: 'conflicts',  label: 'CONFLICTS',   sub: 'KINETIC · GRAY ZONE',           hotkey: '9' },
];

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
function LayerRow({ layer, active, opacity, onToggle, onOpacity, color }) {
  return (
    <div className={`layer-row ${active ? 'active' : ''}`}>
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
    </div>
  );
}

// ============ DTG CLOCK ============
function useDTG() {
  const [dtg, setDtg] = useState('');
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const p2 = n => String(n).padStart(2, '0');
      const dd = p2(d.getUTCDate());
      const hh = p2(d.getUTCHours());
      const mm = p2(d.getUTCMinutes());
      const ss = p2(d.getUTCSeconds());
      const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()];
      const yy = String(d.getUTCFullYear()).slice(2);
      setDtg(`${dd}${hh}${mm}${ss}Z ${mon}${yy}`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return dtg;
}

// ============ TOP BAR ============
function TopBar({ theme, classification, layerCount, onResetView }) {
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
        <div className="op-badge">OP <span>SENTINEL</span></div>
      </div>
    </div>
  );
}

// ============ BOTTOM STATUS ============
function BottomBar({ theme, stats, lat, lon, zoom }) {
  return (
    <div className="bottom-bar">
      <div className="stat">
        <span className="st-lbl">LAYERS</span>
        <span className="st-val">{stats.activeLayers}/9</span>
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
        <span className="st-lbl">SATS</span>
        <span className="st-val">{stats.sats}</span>
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
        <span className="live-dot" /> LIVE · SIMULATION
      </div>
    </div>
  );
}

// ============ RIGHT RAIL — EVENT TICKER ============
function EventFeed({ active, theme }) {
  const items = useMemo(() => {
    const D = window.MOCK_DATA;
    const feed = [];
    if (active.news) {
      D.news.slice(0, 30).forEach(n => feed.push({
        t: n.ts, kind: 'NEWS', cat: n.category, city: n.city, country: n.country,
        title: n.title, meta: `${n.sources} SRC`,
        color: n.sources < 12 ? '#f5d142' : n.sources < 25 ? '#f58a42' : '#e03535',
      }));
    }
    if (active.cyber) {
      D.cyber.slice(0, 15).forEach(c => feed.push({
        t: Date.now() - Math.random() * 3600000, kind: 'CYB', cat: c.severity,
        city: c.target.label, country: '--', title: `${c.type} → ${c.target.label}`, meta: c.severity,
        color: c.severity === 'CRIT' ? '#ff3370' : c.severity === 'HIGH' ? '#ff5c2e' : '#f5a742',
      }));
    }
    if (active.conflicts) {
      D.conflicts.slice(0, 14).forEach(c => feed.push({
        t: Date.now() - Math.random() * 7200000, kind: 'CFL', cat: c.level > 0.7 ? 'KIN' : 'GRAY',
        city: c.country, country: '--', title: c.note, meta: `L${Math.round(c.level * 10)}`,
        color: c.level > 0.7 ? '#ff3040' : c.level > 0.4 ? '#ff7050' : '#f5a742',
      }));
    }
    if (active.flights) {
      D.flights.slice(0, 6).forEach(f => feed.push({
        t: Date.now() - Math.random() * 600000, kind: 'AVN', cat: 'RTE',
        city: f.dest.name, country: f.dest.country, title: `${f.id} ${f.origin.country}→${f.dest.country}`, meta: `FL${Math.floor(f.alt/100)}`,
        color: theme.flight,
      }));
    }
    feed.sort((a, b) => b.t - a.t);
    return feed.slice(0, 60);
  }, [active, theme]);

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
          <div key={i} className="feed-item">
            <div className="feed-tag" style={{ color: it.color, borderColor: it.color }}>{it.kind}</div>
            <div className="feed-body">
              <div className="feed-title">{it.title}</div>
              <div className="feed-meta">
                <span>{it.city}</span>
                <span className="feed-dot">·</span>
                <span>{it.meta}</span>
                <span className="feed-dot">·</span>
                <span>{fmtT(it.t)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ DETAIL INSPECTOR ============
function Inspector({ pick, onClose, theme }) {
  if (!pick) return (
    <div className="inspector empty">
      <div className="insp-hd">INSPECTOR</div>
      <div className="insp-empty">
        <div className="reticle">
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="20" fill="none" stroke={theme.textDim} strokeWidth="0.8" />
            <circle cx="30" cy="30" r="12" fill="none" stroke={theme.textDim} strokeWidth="0.6" strokeDasharray="2 3" />
            <line x1="30" y1="5" x2="30" y2="15" stroke={theme.textDim} /><line x1="30" y1="45" x2="30" y2="55" stroke={theme.textDim} />
            <line x1="5" y1="30" x2="15" y2="30" stroke={theme.textDim} /><line x1="45" y1="30" x2="55" y2="30" stroke={theme.textDim} />
          </svg>
        </div>
        <div>CLICK A DATA POINT ON GLOBE</div>
        <div className="sub">TO OPEN INSPECTOR</div>
      </div>
    </div>
  );

  const { kind, data } = pick;
  return (
    <div className="inspector">
      <div className="insp-hd">
        <span>INSPECTOR / {kind.toUpperCase()}</span>
        <button className="insp-close" onClick={onClose}>✕</button>
      </div>
      <div className="insp-body">
        {kind === 'news' && <NewsDetail d={data} />}
        {kind === 'city' && <CityDetail d={data} />}
        {kind === 'flight' && <FlightDetail d={data} />}
        {kind === 'vessel' && <VesselDetail d={data} />}
        {kind === 'cyber' && <CyberDetail d={data} />}
        {kind === 'satellite' && <SatDetail d={data} />}
        {kind === 'storm' && <StormDetail d={data} />}
        {kind === 'conflict' && <ConflictDetail d={data} />}
      </div>
    </div>
  );
}

const Row = ({ k, v, color }) => (
  <div className="kv"><span className="k">{k}</span><span className="v" style={color ? { color } : null}>{v}</span></div>
);

function NewsDetail({ d }) {
  const color = d.sources < 12 ? '#f5d142' : d.sources < 25 ? '#f58a42' : '#e03535';
  const confidence = d.sources < 12 ? 'EMERGING' : d.sources < 25 ? 'CONFIRMED' : 'HIGH CONFIDENCE';
  return (
    <>
      <div className="insp-title" style={{ color }}>{d.title}</div>
      <div className="heat-bar"><div className="heat-fill" style={{ width: `${(d.sources / 50) * 100}%`, background: color }} /></div>
      <Row k="EVENT ID" v={d.id} />
      <Row k="CATEGORY" v={d.category} />
      <Row k="LOCATION" v={`${d.city}, ${d.country}`} />
      <Row k="COORD" v={`${d.lat.toFixed(2)}, ${d.lon.toFixed(2)}`} />
      <Row k="SOURCES" v={d.sources} color={color} />
      <Row k="CONFIDENCE" v={confidence} color={color} />
      <Row k="FIRST RPT" v={new Date(d.ts).toUTCString().replace('GMT', 'Z')} />
    </>
  );
}
function CityDetail({ d }) {
  return (<>
    <div className="insp-title">{d.name}</div>
    <Row k="COUNTRY" v={d.country} /><Row k="POP" v={`${d.pop}M`} /><Row k="COORD" v={`${d.lat}, ${d.lon}`} />
  </>);
}
function FlightDetail({ d }) {
  return (<>
    <div className="insp-title">{d.id}</div>
    <Row k="ORIGIN" v={`${d.origin.name} (${d.origin.country})`} />
    <Row k="DEST" v={`${d.dest.name} (${d.dest.country})`} />
    <Row k="ALT" v={`FL${Math.floor(d.alt/100)}`} />
    <Row k="PROGRESS" v={`${Math.round(d.progress * 100)}%`} />
  </>);
}
function VesselDetail({ d }) {
  return (<>
    <div className="insp-title">{d.id} · {d.type.toUpperCase()}</div>
    <Row k="TYPE" v={d.type} /><Row k="LANE" v={d.lane} /><Row k="HDG" v={d.dir > 0 ? 'EB' : 'WB'} />
  </>);
}
function CyberDetail({ d }) {
  const color = d.severity === 'CRIT' ? '#ff3370' : d.severity === 'HIGH' ? '#ff5c2e' : '#f5a742';
  return (<>
    <div className="insp-title" style={{ color }}>{d.type} / {d.severity}</div>
    <Row k="EVENT ID" v={d.id} />
    <Row k="ORIGIN" v={d.origin.label} />
    <Row k="TARGET" v={d.target.label} />
    <Row k="VECTOR" v={d.type} />
    <Row k="SEVERITY" v={d.severity} color={color} />
  </>);
}
function SatDetail({ d }) {
  return (<>
    <div className="insp-title">{d.id} / {d.type}</div>
    <Row k="ALTITUDE" v={`${Math.round(d.alt)} KM`} />
    <Row k="INCLIN" v={`${d.inclination.toFixed(1)}°`} />
    <Row k="ORBIT" v={d.type} />
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
    <div className="insp-title" style={{ color }}>{d.country}</div>
    <Row k="THREAT LVL" v={`${Math.round(d.level * 10)}/10`} color={color} />
    <Row k="STATUS" v={d.note} />
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

// ============ MAIN APP ============
function App() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "tactical",
    "density": "normal",
    "projection": "outlined",
    "grid": true,
    "labels": true,
    "spin": true,
    "classification": "UNCLASSIFIED // SIMULATION"
  }/*EDITMODE-END*/;

  const [tweaks, setTweaks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gd_tweaks')) || TWEAK_DEFAULTS; }
    catch { return TWEAK_DEFAULTS; }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [active, setActive] = useState(() => {
    const a = {}; LAYERS.forEach(l => a[l.id] = false); return a;
  });
  const [opacity, setOpacity] = useState(() => {
    const a = {}; LAYERS.forEach(l => a[l.id] = 1); return a;
  });
  const [pick, setPick] = useState(null);
  const [camInfo, setCamInfo] = useState({ lat: 0, lon: 0, zoom: '1.0' });
  const globeRef = useRef(null);
  const engineRef = useRef(null);
  const theme = window.THEMES[tweaks.theme];

  useEffect(() => { localStorage.setItem('gd_tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  // Init engine once
  useEffect(() => {
    if (!globeRef.current || engineRef.current) return;
    const e = window.GlobeEngine.create(globeRef.current, theme);
    e.buildAll();
    e.onPick(p => setPick(p));
    engineRef.current = e;

    // Camera info updater
    const id = setInterval(() => {
      if (!engineRef.current) return;
      const eng = engineRef.current;
      const lat = Math.round(-eng.rotationX * 180 / Math.PI * 100) / 100;
      const lon = Math.round(((-eng.rotationY * 180 / Math.PI) % 360 + 540) % 360 - 180);
      setCamInfo({ lat, lon, zoom: (320 / eng.currentZ).toFixed(2) });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Apply layer visibility / opacity
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    LAYERS.forEach(l => {
      e.setLayerVisible(l.id, active[l.id]);
      e.setLayerOpacity(l.id, opacity[l.id]);
    });
  }, [active, opacity]);

  // Grid / labels / projection / spin
  useEffect(() => {
    const e = engineRef.current; if (!e) return;
    e.setGridVisible(tweaks.grid);
    if (e.landmasses) e.landmasses.visible = tweaks.projection !== 'wireframe';
    e.autoSpin = tweaks.spin;
  }, [tweaks]);

  // Hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < LAYERS.length) {
        const l = LAYERS[idx];
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
    const D = window.MOCK_DATA;
    return {
      activeLayers: Object.values(active).filter(Boolean).length,
      flights: active.flights ? D.flights.length : 0,
      vessels: active.logistics ? D.vessels.length : 0,
      sats: active.satellites ? D.satellites.length : 0,
      news: active.news ? D.news.length : 0,
      cyber: active.cyber ? D.cyber.length : 0,
      conflicts: active.conflicts ? D.conflicts.length : 0,
    };
  }, [active]);

  const colorFor = (id) => {
    const m = {
      geologic: theme.mountain, geographic: theme.city, climate: theme.storm,
      news: '#f58a42', logistics: theme.lane, flights: theme.flight,
      cyber: '#ff5c2e', satellites: theme.satLeo, conflicts: '#ff3040',
    };
    return m[id] || theme.accent;
  };

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
    // Rebuild color-dependent static parts (landmass + grid)
    // For simplicity, do a small rebuild:
    e.root.remove(e.grid);
    e.root.remove(e.landmasses);
    e.scene.remove(e.glowMesh);
    e.root.remove(e.coreMesh);
    e._buildGlow();
    e._buildGrid();
    e._buildLandmasses();
    e.setGridVisible(tweaks.grid);
    if (e.landmasses) e.landmasses.visible = tweaks.projection !== 'wireframe';
    e.buildAll();
    LAYERS.forEach(l => {
      e.setLayerVisible(l.id, active[l.id]);
      e.setLayerOpacity(l.id, opacity[l.id]);
    });
  }, [tweaks.theme]);

  return (
    <div className="app">
      <TopBar
        theme={theme}
        classification={tweaks.classification}
        layerCount={stats.activeLayers}
        onResetView={() => engineRef.current?.resetView()}
      />
      <div className="main">
        {/* LEFT RAIL */}
        <aside className="rail-left">
          <div className="rail-hd">
            <span>DATA LAYERS</span>
            <span className="rail-hd-count">{stats.activeLayers} ON</span>
          </div>
          <div className="layers">
            {LAYERS.map(l => (
              <LayerRow
                key={l.id}
                layer={l}
                active={active[l.id]}
                opacity={opacity[l.id]}
                color={colorFor(l.id)}
                onToggle={() => setActive(a => ({ ...a, [l.id]: !a[l.id] }))}
                onOpacity={v => setOpacity(o => ({ ...o, [l.id]: v }))}
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
        <div className="globe-wrap">
          <div ref={globeRef} className="globe" />
          {/* Corner crosshairs */}
          <div className="xh xh-tl"><span/><span/></div>
          <div className="xh xh-tr"><span/><span/></div>
          <div className="xh xh-bl"><span/><span/></div>
          <div className="xh xh-br"><span/><span/></div>

          {/* Zoom controls */}
          <div className="zoom-controls">
            <button onClick={() => engineRef.current?.zoomBy(0.85)}>+</button>
            <div className="zoom-rail">
              <div className="zoom-tick" style={{top: `${(1 - (parseFloat(camInfo.zoom) - 0.5) / 1.8) * 100}%`}} />
            </div>
            <button onClick={() => engineRef.current?.zoomBy(1.18)}>−</button>
          </div>

          {/* Bearing indicator */}
          <div className="bearing">
            <svg width="60" height="60" viewBox="-30 -30 60 60">
              <circle r="28" fill="none" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
              <circle r="22" fill="none" stroke="currentColor" strokeWidth="0.5" opacity=".3" strokeDasharray="2 2" />
              <g transform={`rotate(${-camInfo.lon})`}>
                <path d="M0 -26 L3 -20 L0 -22 L-3 -20 Z" fill={theme.accent} />
              </g>
              <text x="0" y="-16" textAnchor="middle" fontSize="6" fill="currentColor">N</text>
            </svg>
          </div>

          {/* Scanline overlay */}
          <div className="scanlines" />

          {/* Inspector (only when something picked) */}
          {pick && <div className="picked-wrap"><Inspector pick={pick} onClose={() => setPick(null)} theme={theme} /></div>}
        </div>

        {/* RIGHT RAIL — FEED + EMPTY INSPECTOR */}
        <aside className="rail-right">
          <Inspector pick={null} theme={theme} />
          <EventFeed active={active} theme={theme} />
        </aside>
      </div>
      <BottomBar theme={theme} stats={stats} lat={camInfo.lat} lon={camInfo.lon} zoom={camInfo.zoom} />

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

ReactDOM.render(<App />, document.getElementById('root'));
