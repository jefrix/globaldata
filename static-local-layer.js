(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const GEORGIA_COUNTIES_URL = 'https://cdn.jsdelivr.net/gh/plotly/datasets@master/geojson-counties-fips.json';
  const originalCreate = window.GlobeEngine.create;
  const FALLBACK_BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const MIN_LOCAL_ZOOM = 1;
  const MAX_LOCAL_ZOOM = 5;
  let countyPromise = null;
  let countyCache = null;
  let overlayReady = false;
  let localZoom = 1;

  function ensureLayer(engine) {
    if (!engine.layerGroups) engine.layerGroups = {};
    if (!engine.layerGroups.local) {
      const group = new THREE.Group();
      group.visible = false;
      engine.layerGroups.local = group;
      engine.root?.add?.(group);
    }
    return engine.layerGroups.local;
  }

  function ringsFromGeometry(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates || [];
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).flat();
    return [];
  }

  function validLonLat(point) {
    return Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]));
  }

  function cleanRing(ring) {
    return (ring || [])
      .filter(validLonLat)
      .map(([lon, lat]) => [Number(lon), Number(lat)]);
  }

  function isGeorgiaCounty(feature) {
    const props = feature.properties || {};
    const id = String(feature.id || props.GEOID || props.COUNTYFP || props.COUNTY || '').padStart(5, '0');
    const geoId = String(props.GEO_ID || props.GEOID || '');
    const state = String(props.STATE || props.STATEFP || '').padStart(2, '0');
    return id.startsWith('13') || geoId.includes('US13') || state === '13';
  }

  function centroid(rings) {
    let lat = 0;
    let lon = 0;
    let count = 0;
    rings.forEach(ring => {
      ring.forEach(point => {
        lon += point[0];
        lat += point[1];
        count += 1;
      });
    });
    return count ? { lat: lat / count, lon: lon / count } : null;
  }

  function fallbackCounties() {
    const counties = [
      ['Fulton', 33.79, -84.47], ['DeKalb', 33.77, -84.23], ['Gwinnett', 33.96, -84.02],
      ['Cobb', 33.94, -84.57], ['Clayton', 33.54, -84.36], ['Chatham', 32.0, -81.13],
      ['Richmond', 33.36, -82.07], ['Muscogee', 32.51, -84.88], ['Bibb', 32.81, -83.69],
      ['Houston', 32.46, -83.66], ['Clarke', 33.95, -83.37], ['Lowndes', 30.84, -83.27],
      ['Dougherty', 31.53, -84.22], ['Whitfield', 34.8, -84.97], ['Glynn', 31.23, -81.5],
      ['Camden', 30.92, -81.65],
    ];
    return counties.map(([name, lat, lon], index) => ({
      id: `ga-fallback-${index}`,
      name,
      rings: [],
      center: { lat, lon },
      fallback: true,
    }));
  }

  async function loadGeorgiaCounties() {
    if (countyCache) return countyCache;
    if (!countyPromise) {
      countyPromise = fetch(GEORGIA_COUNTIES_URL)
        .then(response => {
          if (!response.ok) throw new Error(`counties HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          const counties = (data.features || [])
            .filter(isGeorgiaCounty)
            .map(feature => {
              const rings = ringsFromGeometry(feature.geometry).map(cleanRing).filter(ring => ring.length > 2);
              return {
                id: feature.id || feature.properties?.GEO_ID || feature.properties?.COUNTY,
                name: feature.properties?.NAME || feature.properties?.name || 'Georgia County',
                rings,
                center: centroid(rings),
                properties: feature.properties || {},
              };
            })
            .filter(county => county.center)
            .sort((a, b) => a.name.localeCompare(b.name));
          countyCache = counties.length ? counties : fallbackCounties();
          return countyCache;
        })
        .catch(() => {
          countyCache = fallbackCounties();
          return countyCache;
        });
    }
    return countyPromise;
  }

  function ensureOverlayStyles() {
    if (document.querySelector('[data-local-map-style]')) return;
    const style = document.createElement('style');
    style.dataset.localMapStyle = '1';
    style.textContent = `
      .globe-wrap.local-map-mode .globe,
      .globe-wrap.local-map-mode .zoom-controls,
      .globe-wrap.local-map-mode .bearing {
        opacity: 0;
        pointer-events: none;
      }
      .local-map-overlay {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: grid;
        grid-template-rows: auto 1fr auto;
        gap: 10px;
        padding: 20px 22px 18px;
        background:
          linear-gradient(90deg, rgba(115,255,154,0.05) 1px, transparent 1px),
          linear-gradient(0deg, rgba(115,255,154,0.05) 1px, transparent 1px),
          radial-gradient(circle at 50% 50%, rgba(115,255,154,0.10), transparent 62%),
          linear-gradient(to bottom, var(--bg1), var(--bg2));
        background-size: 34px 34px, 34px 34px, auto, auto;
      }
      .local-map-overlay[hidden] { display: none; }
      .local-map-top,
      .local-map-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--mono);
        letter-spacing: 0.18em;
        color: var(--text-dim);
        z-index: 2;
      }
      .local-map-title {
        color: #73ff9a;
        font-size: 12px;
        font-weight: 600;
      }
      .local-map-status,
      .local-map-foot {
        font-size: 10px;
      }
      .local-map-stage {
        position: relative;
        min-height: 0;
        border: 1px solid rgba(115,255,154,0.22);
        background: rgba(0,0,0,0.16);
        overflow: hidden;
      }
      .local-map-svg {
        width: 100%;
        height: 100%;
        display: block;
        transform-origin: 50% 50%;
        transition: transform 0.16s ease-out;
      }
      .local-zoom-controls {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 6;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        font-family: var(--mono);
      }
      .local-zoom-controls button {
        width: 26px;
        height: 26px;
        border: 1px solid var(--edge);
        border-radius: 1px;
        background: rgba(0,0,0,0.48);
        color: var(--text);
        cursor: pointer;
        font: inherit;
        font-size: 14px;
      }
      .local-zoom-controls button:hover {
        color: var(--accent);
        border-color: var(--accent);
      }
      .local-zoom-rail {
        position: relative;
        width: 2px;
        height: 90px;
        background: rgba(59,141,245,0.38);
      }
      .local-zoom-tick {
        position: absolute;
        left: -3px;
        width: 8px;
        height: 2px;
        background: var(--accent);
        transition: top 0.16s ease-out;
      }
      .local-zoom-label {
        min-width: 34px;
        text-align: center;
        color: var(--accent);
        font-size: 8px;
        letter-spacing: 0.1em;
      }
      .local-county {
        fill: rgba(115,255,154,0.105);
        stroke: rgba(115,255,154,0.72);
        stroke-width: 0.75;
        vector-effect: non-scaling-stroke;
        cursor: pointer;
      }
      .local-county:hover {
        fill: rgba(115,255,154,0.28);
        stroke: #f5d142;
      }
      .local-county-label {
        fill: rgba(207,226,255,0.78);
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.08em;
        text-anchor: middle;
        pointer-events: none;
      }
      .local-fallback-point {
        fill: #73ff9a;
        stroke: rgba(0,0,0,0.8);
        stroke-width: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGeorgiaOverlay() {
    ensureOverlayStyles();
    const wrap = document.querySelector('.globe-wrap');
    if (!wrap) return null;
    let overlay = wrap.querySelector('[data-local-map-overlay]');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'local-map-overlay';
    overlay.dataset.localMapOverlay = '1';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="local-map-top">',
      '<div class="local-map-title">LOCAL / GEORGIA USA</div>',
      '<div class="local-map-status" data-local-map-status>LOADING COUNTIES</div>',
      '</div>',
      '<div class="local-map-stage">',
      '<svg class="local-map-svg" data-local-map-svg role="img" aria-label="Georgia county map"></svg>',
      '<div class="local-zoom-controls" data-local-zoom-controls>',
      '<button type="button" data-local-zoom-in aria-label="Zoom local map in">+</button>',
      '<div class="local-zoom-rail"><div class="local-zoom-tick" data-local-zoom-tick></div></div>',
      '<button type="button" data-local-zoom-out aria-label="Zoom local map out">-</button>',
      '<div class="local-zoom-label" data-local-zoom-label>1.0x</div>',
      '</div>',
      '</div>',
      '<div class="local-map-foot">',
      '<span>COUNTY LEVEL VIEW</span>',
      '<span data-local-map-readout>STATEWIDE</span>',
      '</div>',
    ].join('');
    wrap.appendChild(overlay);
    wireLocalZoom(overlay);
    applyLocalZoom();
    return overlay;
  }

  function clampZoom(value) {
    return Math.max(MIN_LOCAL_ZOOM, Math.min(MAX_LOCAL_ZOOM, Number(value) || MIN_LOCAL_ZOOM));
  }

  function applyLocalZoom() {
    const overlay = document.querySelector('[data-local-map-overlay]');
    const svg = overlay?.querySelector('[data-local-map-svg]');
    if (svg) svg.style.transform = `scale(${localZoom})`;
    const tick = overlay?.querySelector('[data-local-zoom-tick]');
    const label = overlay?.querySelector('[data-local-zoom-label]');
    const progress = (localZoom - MIN_LOCAL_ZOOM) / (MAX_LOCAL_ZOOM - MIN_LOCAL_ZOOM);
    if (tick) tick.style.top = `${(1 - progress) * 100}%`;
    if (label) label.textContent = `${localZoom.toFixed(1)}x`;
  }

  function zoomLocalBy(factor) {
    localZoom = clampZoom(localZoom * factor);
    applyLocalZoom();
  }

  function wireLocalZoom(overlay) {
    if (!overlay || overlay.dataset.localZoomWired) return;
    overlay.dataset.localZoomWired = '1';
    overlay.querySelector('[data-local-zoom-in]')?.addEventListener('click', () => zoomLocalBy(1.25));
    overlay.querySelector('[data-local-zoom-out]')?.addEventListener('click', () => zoomLocalBy(0.8));
    overlay.querySelector('.local-map-stage')?.addEventListener('wheel', event => {
      if (!document.querySelector('.globe-wrap.local-map-mode')) return;
      event.preventDefault();
      zoomLocalBy(event.deltaY < 0 ? 1.18 : 0.85);
    }, { passive: false });
  }

  function countyBounds(counties) {
    const bounds = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
    counties.forEach(county => {
      county.rings.forEach(ring => {
        ring.forEach(([lon, lat]) => {
          bounds.minLon = Math.min(bounds.minLon, lon);
          bounds.maxLon = Math.max(bounds.maxLon, lon);
          bounds.minLat = Math.min(bounds.minLat, lat);
          bounds.maxLat = Math.max(bounds.maxLat, lat);
        });
      });
    });
    return Number.isFinite(bounds.minLon) ? bounds : FALLBACK_BOUNDS;
  }

  function projectionFor(counties, width, height) {
    const bounds = countyBounds(counties);
    const pad = Math.max(16, Math.min(width, height) * 0.04);
    const spanLon = bounds.maxLon - bounds.minLon || 1;
    const spanLat = bounds.maxLat - bounds.minLat || 1;
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
    const mapW = spanLon * scale;
    const mapH = spanLat * scale;
    const ox = (width - mapW) / 2;
    const oy = (height - mapH) / 2;
    return ([lon, lat]) => [
      ox + (lon - bounds.minLon) * scale,
      oy + (bounds.maxLat - lat) * scale,
    ];
  }

  function ringPath(ring, project) {
    return ring.map((point, index) => {
      const [x, y] = project(point);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }

  function drawCountyMap(counties) {
    const overlay = ensureGeorgiaOverlay();
    if (!overlay) return;
    const svg = overlay.querySelector('[data-local-map-svg]');
    const status = overlay.querySelector('[data-local-map-status]');
    const readout = overlay.querySelector('[data-local-map-readout]');
    const stage = overlay.querySelector('.local-map-stage');
    const rect = stage.getBoundingClientRect();
    const width = Math.max(320, rect.width || 900);
    const height = Math.max(320, rect.height || 620);
    const project = projectionFor(counties, width, height);
    const labelNames = new Set(['Fulton', 'Cobb', 'DeKalb', 'Gwinnett', 'Chatham', 'Richmond', 'Muscogee', 'Bibb', 'Clarke', 'Lowndes']);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.replaceChildren();

    counties.forEach(county => {
      if (county.rings.length) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'local-county');
        path.setAttribute('d', county.rings.map(ring => ringPath(ring, project)).join(' '));
        path.dataset.countyName = county.name;
        path.addEventListener('mouseenter', () => {
          readout.textContent = `${county.name.toUpperCase()} COUNTY`;
        });
        path.addEventListener('mouseleave', () => {
          readout.textContent = 'STATEWIDE';
        });
        svg.appendChild(path);
      } else if (county.center) {
        const [x, y] = project([county.center.lon, county.center.lat]);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'local-fallback-point');
        circle.setAttribute('cx', x.toFixed(2));
        circle.setAttribute('cy', y.toFixed(2));
        circle.setAttribute('r', '4');
        svg.appendChild(circle);
      }

      if (county.center && labelNames.has(county.name)) {
        const [x, y] = project([county.center.lon, county.center.lat]);
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'local-county-label');
        label.setAttribute('x', x.toFixed(2));
        label.setAttribute('y', y.toFixed(2));
        label.textContent = county.name.toUpperCase();
        svg.appendChild(label);
      }
    });

    status.textContent = `${counties.length} COUNTIES`;
    overlayReady = true;
  }

  function showGeorgiaOverlay(active) {
    const wrap = document.querySelector('.globe-wrap');
    const overlay = ensureGeorgiaOverlay();
    if (!wrap || !overlay) return;
    wrap.classList.toggle('local-map-mode', active);
    overlay.hidden = !active;
    if (active) applyLocalZoom();
    if (active && !overlayReady) {
      loadGeorgiaCounties().then(drawCountyMap);
    }
  }

  function setUiActive(row, active) {
    row.classList.toggle('active', active);
    const knob = row.querySelector('[data-local-knob]');
    const button = row.querySelector('[data-local-toggle]');
    const slider = row.querySelector('input[type="range"]');
    if (button) {
      button.style.background = active ? '#73ff9a' : 'transparent';
      button.style.borderColor = active ? '#73ff9a' : 'var(--edge)';
      button.setAttribute('aria-pressed', String(active));
    }
    if (knob) {
      knob.style.left = active ? '17px' : '1px';
      knob.style.background = active ? '#000' : 'var(--text-dim)';
    }
    if (slider) slider.disabled = !active;
  }

  function applyLocal(active) {
    const engine = window.__globalDataEngine;
    if (engine?.layerGroups?.local) {
      engine.setLayerVisible?.('local', active);
    }
    showGeorgiaOverlay(active);
    document.querySelectorAll('[data-local-row]').forEach(row => setUiActive(row, active));
  }

  function injectUi() {
    const engine = window.__globalDataEngine;
    const layers = document.querySelector('.layers');
    if (!engine || !layers || layers.querySelector('[data-local-row]')) return;

    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.localRow = '1';
    row.innerHTML = [
      '<div class="layer-head">',
      '<div class="layer-idx">L</div>',
      '<div style="flex:1;min-width:0">',
      '<div class="layer-label">LOCAL</div>',
      '<div class="layer-sub">GEORGIA / COUNTY LEVEL</div>',
      '</div>',
      '<button data-local-toggle aria-pressed="false" style="width:32px;height:16px;border-radius:2px;position:relative;cursor:pointer;background:transparent;border:1px solid var(--edge);padding:0;flex-shrink:0">',
      '<span data-local-knob style="position:absolute;top:1px;left:1px;width:12px;height:12px;background:var(--text-dim);transition:left .15s"></span>',
      '</button>',
      '</div>',
      '<div class="layer-slider">',
      '<span class="sl-lbl">OPA</span>',
      '<input type="range" min="0" max="100" value="100" class="opSlider" style="--sc:#73ff9a;opacity:.3" disabled>',
      '<span class="sl-val">100</span>',
      '</div>',
    ].join('');

    const toggle = row.querySelector('[data-local-toggle]');
    const slider = row.querySelector('input[type="range"]');
    const value = row.querySelector('.sl-val');
    toggle.addEventListener('click', () => applyLocal(!engine.layerGroups.local?.visible));
    slider.addEventListener('input', event => {
      const opacity = Number(event.target.value) / 100;
      value.textContent = String(Math.round(opacity * 100)).padStart(3, '0');
      const overlay = ensureGeorgiaOverlay();
      if (overlay) overlay.style.opacity = String(Math.max(0.15, opacity));
      engine.setLayerOpacity?.('local', opacity);
    });

    const infra = layers.querySelector('[data-infra-row]');
    if (infra?.nextSibling) layers.insertBefore(row, infra.nextSibling);
    else layers.insertBefore(row, layers.children[2] || null);
    setUiActive(row, Boolean(engine.layerGroups.local?.visible));
  }

  window.GlobalDataLocalLayer = {
    setActive: applyLocal,
    redraw: () => loadGeorgiaCounties().then(drawCountyMap),
    setZoom: value => {
      localZoom = clampZoom(value);
      applyLocalZoom();
    },
    getZoom: () => localZoom,
  };

  window.addEventListener('keydown', event => {
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    if (document.querySelector('.globe-wrap.local-map-mode') && ['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      zoomLocalBy(event.key === '+' || event.key === '=' ? 1.25 : 0.8);
      return;
    }
    if (event.key !== 'l' && event.key !== 'L') return;
    const engine = window.__globalDataEngine;
    applyLocal(!engine?.layerGroups?.local?.visible);
  }, true);

  window.addEventListener('resize', () => {
    if (document.querySelector('.globe-wrap.local-map-mode')) {
      loadGeorgiaCounties().then(drawCountyMap);
    }
  });

  setInterval(injectUi, 1200);

  window.GlobeEngine.create = function localLayerCreate(el, theme) {
    const engine = originalCreate(el, theme);
    window.__globalDataEngine = engine;
    const originalEnsure = engine._ensureLayerGroups?.bind(engine);
    const originalUpdate = engine.updateLiveData?.bind(engine);

    engine._ensureLayerGroups = function localEnsure() {
      originalEnsure?.();
      ensureLayer(engine);
    };
    engine.updateLiveData = function localUpdate(data) {
      originalUpdate?.(data);
      loadGeorgiaCounties();
    };

    engine._ensureLayerGroups();
    loadGeorgiaCounties();
    injectUi();
    return engine;
  };
})();
