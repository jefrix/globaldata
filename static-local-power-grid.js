(function () {
  const BOUNDS = { minLon: -85.70, maxLon: -80.75, minLat: 30.30, maxLat: 35.08 };
  const SERVICE_URL = 'https://services2.arcgis.com/LYMgRMwHfrWWEg3s/ArcGIS/rest/services/HIFLD_US_Electric_Power_Transmission_Lines/FeatureServer/0/query';
  const MAX_FEATURES = 2800;
  const PAGE_SIZE = 2000;
  const FIELD_LIST = 'ID,TYPE,STATUS,SOURCE,SOURCEDATE,OWNER,VOLTAGE,VOLT_CLASS,INFERRED,SUB_1,SUB_2';
  const FALLBACK_LINES = [
    { id: 'fallback-500-atl-macon', owner: 'Georgia transmission corridor', voltage: 500, type: 'AC, OVERHEAD', status: 'IN SERVICE', points: [[34.05, -84.25], [33.75, -84.39], [33.15, -84.05], [32.84, -83.64], [32.54, -82.90], [32.08, -81.10]] },
    { id: 'fallback-230-savannah', owner: 'Georgia transmission corridor', voltage: 230, type: 'AC, OVERHEAD', status: 'IN SERVICE', points: [[33.47, -82.00], [33.10, -82.02], [32.62, -82.20], [32.08, -81.10], [31.55, -81.28]] },
    { id: 'fallback-230-coast', owner: 'Georgia coastal corridor', voltage: 230, type: 'AC, OVERHEAD', status: 'IN SERVICE', points: [[32.56, -80.99], [32.08, -81.10], [31.23, -81.50], [30.74, -81.65]] },
    { id: 'fallback-230-south', owner: 'South Georgia corridor', voltage: 230, type: 'AC, OVERHEAD', status: 'IN SERVICE', points: [[32.46, -84.99], [31.58, -84.17], [31.21, -83.25], [31.15, -82.35], [31.23, -81.50]] },
    { id: 'fallback-115-north', owner: 'North Georgia corridor', voltage: 115, type: 'AC, OVERHEAD', status: 'IN SERVICE', points: [[34.98, -85.25], [34.25, -85.18], [33.75, -84.39], [34.30, -83.82], [34.98, -83.10]] },
  ];

  let linesPromise = null;
  let lineCache = null;
  let active = false;
  let selectedId = null;
  let lastViewBox = '';
  let drawing = false;

  function ensureStyle() {
    if (document.querySelector('[data-local-power-style]')) return;
    const style = document.createElement('style');
    style.dataset.localPowerStyle = '1';
    style.textContent = `
      .local-placeholder-layer[data-local-placeholder="powerGrid"] .local-placeholder-badge {
        display: none;
      }
      .local-power-line {
        fill: none;
        stroke: var(--power-color, #ff4d5f);
        stroke-width: var(--power-width, 1.0);
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        opacity: 0.82;
        cursor: pointer;
        filter: drop-shadow(0 0 2.6px var(--power-glow, rgba(255,77,95,0.65)));
      }
      .local-power-line.inferred {
        stroke-dasharray: 4 4;
        opacity: 0.58;
      }
      .local-power-line:hover,
      .local-power-line.selected {
        stroke: #ffffff;
        opacity: 1;
        stroke-width: 2.4;
        filter: drop-shadow(0 0 7px rgba(255,255,255,0.78));
      }
      .local-power-hub {
        fill: #ff4d5f;
        stroke: rgba(255,255,255,0.86);
        stroke-width: 0.85;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 4px rgba(255,77,95,0.72));
        pointer-events: none;
      }
      .local-power-legend {
        display: inline-flex;
        gap: 10px;
        align-items: center;
      }
      .local-power-key {
        display: inline-flex;
        gap: 5px;
        align-items: center;
      }
      .local-power-swatch {
        width: 18px;
        height: 3px;
        display: inline-block;
        box-shadow: 0 0 6px currentColor;
      }
    `;
    document.head.appendChild(style);
  }

  function placeholderActive() {
    const marker = document.querySelector('[data-local-placeholder="powerGrid"]');
    const localMode = Boolean(document.querySelector('.globe-wrap.local-map-mode'));
    return Boolean(localMode && (active || (marker && marker.style.display !== 'none')));
  }

  function serviceQuery(offset = 0) {
    const params = new URLSearchParams({
      where: '1=1',
      geometry: `${BOUNDS.minLon},${BOUNDS.minLat},${BOUNDS.maxLon},${BOUNDS.maxLat}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: FIELD_LIST,
      returnGeometry: 'true',
      outSR: '4326',
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      orderByFields: 'OBJECTID_1',
      f: 'geojson',
    });
    return `${SERVICE_URL}?${params}`;
  }

  async function fetchPage(offset) {
    const response = await fetch(serviceQuery(offset));
    if (!response.ok) throw new Error(`HIFLD ${response.status}`);
    return response.json();
  }

  async function loadLines() {
    if (lineCache) return lineCache;
    if (!linesPromise) {
      linesPromise = (async () => {
        const pages = [];
        for (let offset = 0; offset < 6000; offset += PAGE_SIZE) {
          const page = await fetchPage(offset);
          pages.push(...(page.features || []));
          if (!page.exceededTransferLimit && (!page.features || page.features.length < PAGE_SIZE)) break;
        }
        const normalized = pages.flatMap(normalizeFeature).filter(line => line.points.length > 1);
        lineCache = normalized.length ? prioritizeLines(normalized) : FALLBACK_LINES;
        return lineCache;
      })().catch(() => {
        lineCache = FALLBACK_LINES;
        return lineCache;
      });
    }
    return linesPromise;
  }

  function normalizeFeature(feature, index) {
    const props = feature.properties || {};
    const coords = geometryLines(feature.geometry);
    return coords.map((line, part) => {
      const points = line
        .map(([lon, lat]) => [Number(lat), Number(lon)])
        .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))
        .filter(([lat, lon]) => lon >= BOUNDS.minLon - 0.4 && lon <= BOUNDS.maxLon + 0.4 && lat >= BOUNDS.minLat - 0.4 && lat <= BOUNDS.maxLat + 0.4);
      return {
        id: `${props.ID || index}-${part}`,
        hifldId: props.ID,
        owner: props.OWNER || 'Unknown owner',
        voltage: Number(props.VOLTAGE) || 0,
        voltageClass: props.VOLT_CLASS || '',
        type: props.TYPE || 'Transmission line',
        status: props.STATUS || '',
        source: props.SOURCE || 'HIFLD',
        sourceDate: props.SOURCEDATE || '',
        inferred: /^y/i.test(String(props.INFERRED || '')),
        sub1: props.SUB_1 || '',
        sub2: props.SUB_2 || '',
        points: simplify(points),
      };
    });
  }

  function geometryLines(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'LineString') return [geometry.coordinates || []];
    if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
    return [];
  }

  function simplify(points) {
    if (points.length <= 64) return points;
    const step = Math.ceil(points.length / 64);
    const sampled = points.filter((_, index) => index % step === 0);
    const last = points[points.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);
    return sampled;
  }

  function prioritizeLines(lines) {
    return [...lines]
      .sort((a, b) => (b.voltage - a.voltage) || String(a.owner).localeCompare(String(b.owner)))
      .slice(0, MAX_FEATURES)
      .sort((a, b) => (a.voltage - b.voltage));
  }

  function projectFactory(svg) {
    const box = (svg.getAttribute('viewBox') || '0 0 900 620').split(/\s+/).map(Number);
    const width = box[2] || 900;
    const height = box[3] || 620;
    const pad = Math.max(16, Math.min(width, height) * 0.04);
    const spanLon = BOUNDS.maxLon - BOUNDS.minLon;
    const spanLat = BOUNDS.maxLat - BOUNDS.minLat;
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
    const mapW = spanLon * scale;
    const mapH = spanLat * scale;
    const ox = (width - mapW) / 2;
    const oy = (height - mapH) / 2;
    return ([lon, lat]) => [
      ox + (lon - BOUNDS.minLon) * scale,
      oy + (BOUNDS.maxLat - lat) * scale,
    ];
  }

  function pathFor(points, project) {
    return points.map(([lat, lon], index) => {
      const [x, y] = project([lon, lat]);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }

  function powerStyle(voltage) {
    if (voltage >= 500) return { color: '#ff3d8d', glow: 'rgba(255,61,141,0.78)', width: 1.7 };
    if (voltage >= 345) return { color: '#ff5c2e', glow: 'rgba(255,92,46,0.72)', width: 1.45 };
    if (voltage >= 230) return { color: '#f5d142', glow: 'rgba(245,209,66,0.66)', width: 1.2 };
    if (voltage >= 115) return { color: '#5bd7ff', glow: 'rgba(91,215,255,0.48)', width: 0.9 };
    return { color: '#7a94b8', glow: 'rgba(122,148,184,0.34)', width: 0.65 };
  }

  function installLegend(overlay, count) {
    const foot = overlay.querySelector('.local-map-foot');
    const status = overlay.querySelector('[data-local-map-status]');
    if (status) {
      const countyText = String(status.textContent || '').split('/')[0].trim() || '159 COUNTIES';
      status.textContent = `${countyText} / ${count} POWER LINES`;
    }
    if (!foot || foot.querySelector('.local-power-legend')) return;
    const legend = document.createElement('span');
    legend.className = 'local-power-legend';
    legend.innerHTML = [
      '<span class="local-power-key"><i class="local-power-swatch" style="color:#ff3d8d;background:#ff3d8d"></i>500KV+</span>',
      '<span class="local-power-key"><i class="local-power-swatch" style="color:#ff5c2e;background:#ff5c2e"></i>345KV</span>',
      '<span class="local-power-key"><i class="local-power-swatch" style="color:#f5d142;background:#f5d142"></i>230KV</span>',
      '<span class="local-power-key"><i class="local-power-swatch" style="color:#5bd7ff;background:#5bd7ff"></i>115KV</span>',
    ].join('');
    const first = foot.firstElementChild;
    if (first && !first.classList.contains('local-map-legend')) first.replaceWith(legend);
    else foot.prepend(legend);
  }

  async function drawPowerGrid() {
    const wrap = document.querySelector('.globe-wrap.local-map-mode');
    const overlay = wrap?.querySelector('[data-local-map-overlay]');
    const svg = overlay?.querySelector('[data-local-map-svg]');
    if (!wrap || !overlay || !svg || drawing) return;
    ensureStyle();
    const isActive = placeholderActive();
    const viewBox = svg.getAttribute('viewBox') || '';
    const exists = Boolean(svg.querySelector('[data-local-power-grid]'));
    if (viewBox === lastViewBox && exists) {
      svg.querySelectorAll('[data-local-power-grid]').forEach(node => { node.style.display = isActive ? '' : 'none'; });
      return;
    }

    drawing = true;
    try {
      const lines = await loadLines();
      lastViewBox = viewBox;
      svg.querySelectorAll('[data-local-power-grid]').forEach(node => node.remove());
      const project = projectFactory(svg);
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.dataset.localPowerGrid = '1';
      group.style.display = isActive ? '' : 'none';

      lines.forEach(line => {
        const style = powerStyle(line.voltage);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `local-power-line ${line.inferred ? 'inferred' : ''} ${selectedId === line.id ? 'selected' : ''}`);
        path.setAttribute('d', pathFor(line.points, project));
        path.style.setProperty('--power-color', style.color);
        path.style.setProperty('--power-glow', style.glow);
        path.style.setProperty('--power-width', String(style.width));
        path.dataset.powerLineId = line.id;
        path.dataset.voltage = String(line.voltage || '');
        path.addEventListener('mouseenter', () => setReadout(line));
        path.addEventListener('mouseleave', () => setReadout(null));
        path.addEventListener('click', event => {
          event.stopPropagation();
          selectedId = line.id;
          renderInspector(line);
          refreshSelection();
        });
        group.appendChild(path);
      });

      svg.insertBefore(group, svg.querySelector('[data-local-cities]') || null);
      installLegend(overlay, lines.length);
      refreshSelection();
    } finally {
      drawing = false;
    }
  }

  function setReadout(line) {
    const readout = document.querySelector('[data-local-map-readout]');
    if (!readout) return;
    if (!line) {
      readout.textContent = 'STATEWIDE';
      return;
    }
    readout.textContent = `${line.voltage || '?'}KV / ${String(line.owner || 'UNKNOWN').toUpperCase()}`;
  }

  function refreshSelection() {
    document.querySelectorAll('.local-power-line.selected').forEach(node => node.classList.remove('selected'));
    if (selectedId) document.querySelector(`[data-power-line-id="${selectedId}"]`)?.classList.add('selected');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function row(label, value, color) {
    const style = color ? ` style="color:${escapeHtml(color)}"` : '';
    return `<div class="insp-row"><span>${escapeHtml(label)}</span><b${style}>${escapeHtml(value || '--')}</b></div>`;
  }

  function renderInspector(line) {
    const panel = document.querySelector('.rail-right .inspector');
    if (!panel) return;
    const style = powerStyle(line.voltage);
    panel.className = 'inspector active local-power-inspector';
    panel.innerHTML = [
      '<div class="insp-hd">',
      '<span>POWER GRID</span>',
      '<button data-power-close type="button">x</button>',
      '</div>',
      '<div class="insp-body">',
      `<div class="insp-title" style="color:${style.color}">${escapeHtml(line.owner || 'Transmission Line')}</div>`,
      `<div class="heat-bar"><div class="heat-fill" style="width:100%;background:${style.color}"></div></div>`,
      row('VOLTAGE', line.voltage ? `${line.voltage} kV` : line.voltageClass, style.color),
      row('CLASS', line.voltageClass),
      row('TYPE', line.type),
      row('STATUS', line.status),
      row('INFERRED', line.inferred ? 'YES' : 'NO'),
      row('SUB A', line.sub1),
      row('SUB B', line.sub2),
      row('SOURCE', 'HIFLD / Electric Power Transmission Lines'),
      row('DATE', String(line.sourceDate || '').slice(0, 10)),
      '</div>',
    ].join('');
    panel.querySelector('[data-power-close]')?.addEventListener('click', () => {
      selectedId = null;
      refreshSelection();
      panel.className = 'inspector empty';
      panel.innerHTML = [
        '<div class="insp-hd">INSPECTOR</div>',
        '<div class="insp-empty">SELECT A GLOBE OBJECT<br><span>OR CLICK AN EVENT FEED ITEM</span></div>',
      ].join('');
    });
  }

  function syncLayer() {
    const next = placeholderActive();
    const rowSub = document.querySelector('[data-local-menu-layer="powerGrid"] .layer-sub');
    if (rowSub) rowSub.textContent = lineCache ? `${lineCache.length} HIFLD TRANSMISSION LINES` : 'HIFLD TRANSMISSION LINES';
    if (!next) {
      document.querySelectorAll('[data-local-power-grid]').forEach(node => { node.style.display = 'none'; });
      return;
    }
    drawPowerGrid();
  }

  window.GlobalDataPowerGrid = {
    setActive(next) {
      active = Boolean(next);
      drawPowerGrid();
    },
    getActive: () => placeholderActive(),
    refresh: () => {
      lineCache = null;
      linesPromise = null;
      lastViewBox = '';
      return loadLines().then(lines => {
        drawPowerGrid();
        return lines;
      });
    },
  };

  setInterval(syncLayer, 350);
})();
