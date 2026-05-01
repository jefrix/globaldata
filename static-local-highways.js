(function () {
  const COUNTY_URL = 'https://cdn.jsdelivr.net/gh/plotly/datasets@master/geojson-counties-fips.json';
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  const FALLBACK_BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  let boundsPromise = null;
  let highwayPromise = null;
  let drawing = false;

  function isGeorgiaCounty(feature) {
    const props = feature.properties || {};
    const id = String(feature.id || props.GEOID || props.COUNTYFP || props.COUNTY || '').padStart(5, '0');
    const geoId = String(props.GEO_ID || props.GEOID || '');
    const state = String(props.STATE || props.STATEFP || '').padStart(2, '0');
    return id.startsWith('13') || geoId.includes('US13') || state === '13';
  }

  function ringsFromGeometry(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return geometry.coordinates || [];
    if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).flat();
    return [];
  }

  function boundsFromCounties(features) {
    const bounds = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
    features.filter(isGeorgiaCounty).forEach(feature => {
      ringsFromGeometry(feature.geometry).forEach(ring => {
        ring.forEach(point => {
          const lon = Number(point?.[0]);
          const lat = Number(point?.[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          bounds.minLon = Math.min(bounds.minLon, lon);
          bounds.maxLon = Math.max(bounds.maxLon, lon);
          bounds.minLat = Math.min(bounds.minLat, lat);
          bounds.maxLat = Math.max(bounds.maxLat, lat);
        });
      });
    });
    return Number.isFinite(bounds.minLon) ? bounds : FALLBACK_BOUNDS;
  }

  function loadBounds() {
    if (!boundsPromise) {
      boundsPromise = fetch(COUNTY_URL)
        .then(response => {
          if (!response.ok) throw new Error(`county bounds HTTP ${response.status}`);
          return response.json();
        })
        .then(data => boundsFromCounties(data.features || []))
        .catch(() => FALLBACK_BOUNDS);
    }
    return boundsPromise;
  }

  function fallbackHighways() {
    const route = (ref, name, kind, points) => ({ ref, name, kind, points });
    return [
      route('I-75', 'Interstate 75', 'interstate', [[34.98, -84.95], [34.27, -84.80], [33.75, -84.39], [32.84, -83.64], [31.47, -83.52], [30.63, -83.28]]),
      route('I-85', 'Interstate 85', 'interstate', [[34.98, -83.10], [34.31, -83.82], [33.75, -84.39], [33.37, -84.78], [32.85, -85.18]]),
      route('I-20', 'Interstate 20', 'interstate', [[33.65, -85.13], [33.75, -84.39], [33.47, -82.00]]),
      route('I-95', 'Interstate 95', 'interstate', [[30.74, -81.65], [31.18, -81.50], [32.08, -81.15], [32.56, -80.99]]),
      route('I-16', 'Interstate 16', 'interstate', [[32.84, -83.64], [32.44, -82.05], [32.08, -81.10]]),
      route('I-285', 'Interstate 285', 'interstate-loop', [[33.91, -84.43], [33.88, -84.27], [33.77, -84.21], [33.64, -84.33], [33.65, -84.55], [33.79, -84.60], [33.91, -84.43]]),
      route('I-575', 'Interstate 575', 'interstate', [[33.99, -84.53], [34.24, -84.49], [34.47, -84.43]]),
      route('I-985', 'Interstate 985', 'interstate', [[34.08, -83.99], [34.25, -83.86], [34.41, -83.76]]),
      route('I-185', 'Interstate 185', 'interstate', [[33.05, -84.70], [32.84, -84.84], [32.46, -84.99]]),
      route('I-520', 'Bobby Jones Expressway', 'interstate-loop', [[33.51, -82.10], [33.45, -82.06], [33.38, -82.00], [33.32, -81.95]]),
      route('US 19 / GA 400', 'Atlanta to North Georgia Corridor', 'major', [[34.89, -83.97], [34.54, -84.02], [34.21, -84.14], [33.97, -84.35], [33.75, -84.39], [32.88, -84.31], [31.58, -84.17], [30.70, -84.86]]),
      route('US 27', 'Western Georgia Corridor', 'major', [[34.97, -85.25], [34.25, -85.18], [33.58, -85.08], [32.46, -84.99], [31.22, -84.20], [30.72, -84.86]]),
      route('US 80', 'Columbus to Savannah Corridor', 'major', [[32.46, -84.99], [32.54, -83.89], [32.54, -82.91], [32.08, -81.10]]),
      route('US 82', 'South Georgia Corridor', 'major', [[31.18, -85.05], [31.58, -84.17], [31.21, -83.25], [31.15, -82.35], [31.23, -81.50]]),
      route('US 84', 'Wiregrass Corridor', 'major', [[30.83, -85.00], [30.84, -83.98], [30.84, -83.27], [31.20, -82.36], [31.21, -81.48]]),
      route('US 129 / US 441', 'North-South Mountain Corridor', 'major', [[34.95, -83.38], [34.60, -83.76], [33.95, -83.37], [33.08, -83.25], [32.38, -82.59], [31.78, -82.35], [30.84, -83.27]]),
    ];
  }

  function highwayQuery() {
    return [
      '[out:json][timeout:28];',
      '(',
      '  way["highway"~"^(motorway|trunk|primary)$"](30.30,-85.70,35.08,-80.75);',
      ');',
      'out geom;',
    ].join('\n');
  }

  function highwayKind(tags = {}) {
    const highway = tags.highway || '';
    const ref = tags.ref || tags.name || '';
    if (highway === 'motorway' || /\bI-?\s?\d+/.test(ref)) return 'interstate';
    if (highway === 'trunk') return 'major';
    return 'primary';
  }

  function normalizeWay(way) {
    const tags = way.tags || {};
    const points = (way.geometry || [])
      .map(point => [Number(point.lat), Number(point.lon)])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
    if (points.length < 2) return null;
    return {
      ref: tags.ref || tags.name || 'HWY',
      name: tags.name || tags.ref || 'Georgia Highway',
      kind: highwayKind(tags),
      points,
    };
  }

  function loadHighways() {
    if (!highwayPromise) {
      highwayPromise = fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: highwayQuery() }).toString(),
      })
        .then(response => {
          if (!response.ok) throw new Error(`highways HTTP ${response.status}`);
          return response.json();
        })
        .then(data => {
          const roads = (data.elements || [])
            .filter(element => element.type === 'way')
            .map(normalizeWay)
            .filter(Boolean);
          return roads.length ? roads : fallbackHighways();
        })
        .catch(() => fallbackHighways());
    }
    return highwayPromise;
  }

  function ensureStyles() {
    if (document.querySelector('[data-local-highway-style]')) return;
    const style = document.createElement('style');
    style.dataset.localHighwayStyle = '1';
    style.textContent = `
      .local-road {
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        cursor: pointer;
      }
      .local-road.interstate {
        stroke: #ff3d8d;
        stroke-width: 2.6;
        filter: drop-shadow(0 0 4px rgba(255,61,141,0.75));
      }
      .local-road.interstate-loop {
        stroke: #d85cff;
        stroke-width: 2.35;
        filter: drop-shadow(0 0 4px rgba(216,92,255,0.70));
      }
      .local-road.major {
        stroke: #f5d142;
        stroke-width: 1.95;
        filter: drop-shadow(0 0 3px rgba(245,209,66,0.58));
      }
      .local-road.primary {
        stroke: #5bd7ff;
        stroke-width: 1.25;
        opacity: 0.86;
      }
      .local-road:hover {
        stroke: #ffffff;
        stroke-width: 3.1;
      }
      .local-map-legend {
        display: inline-flex;
        gap: 12px;
        align-items: center;
      }
      .local-map-key {
        display: inline-flex;
        gap: 5px;
        align-items: center;
      }
      .local-map-swatch {
        width: 18px;
        height: 3px;
        display: inline-block;
        box-shadow: 0 0 6px currentColor;
      }
    `;
    document.head.appendChild(style);
  }

  function installLegend(overlay) {
    const foot = overlay.querySelector('.local-map-foot');
    if (!foot || foot.querySelector('.local-map-legend')) return;
    const legend = document.createElement('span');
    legend.className = 'local-map-legend';
    legend.innerHTML = [
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#ff3d8d;background:#ff3d8d"></i>INTERSTATE</span>',
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#f5d142;background:#f5d142"></i>MAJOR</span>',
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#5bd7ff;background:#5bd7ff"></i>PRIMARY</span>',
    ].join('');
    const first = foot.firstElementChild;
    if (first) first.replaceWith(legend);
    else foot.prepend(legend);
  }

  function projection(bounds, width, height) {
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

  function pathFor(points, project) {
    return points.map((point, index) => {
      const [lat, lon] = point;
      const [x, y] = project([lon, lat]);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }

  async function drawRoads() {
    const wrap = document.querySelector('.globe-wrap.local-map-mode');
    const overlay = wrap?.querySelector('[data-local-map-overlay]');
    const svg = overlay?.querySelector('[data-local-map-svg]');
    if (!wrap || !overlay || !svg || drawing) return;
    drawing = true;
    ensureStyles();
    installLegend(overlay);

    try {
      const [bounds, roads] = await Promise.all([loadBounds(), loadHighways()]);
      const box = svg.viewBox?.baseVal;
      const width = Math.max(320, box?.width || svg.getBoundingClientRect().width || 900);
      const height = Math.max(320, box?.height || svg.getBoundingClientRect().height || 620);
      const project = projection(bounds, width, height);
      const readout = overlay.querySelector('[data-local-map-readout]');
      const status = overlay.querySelector('[data-local-map-status]');
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const order = { primary: 1, major: 2, 'interstate-loop': 3, interstate: 4 };

      group.dataset.localHighways = '1';
      svg.querySelectorAll('[data-local-highways]').forEach(node => node.remove());
      [...roads].sort((a, b) => (order[a.kind] || 0) - (order[b.kind] || 0)).forEach(road => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `local-road ${road.kind || 'primary'}`);
        path.setAttribute('d', pathFor(road.points, project));
        path.addEventListener('mouseenter', () => {
          if (readout) readout.textContent = `${String(road.ref || road.name).toUpperCase()} / ${String(road.name || '').toUpperCase()}`;
        });
        path.addEventListener('mouseleave', () => {
          if (readout) readout.textContent = 'STATEWIDE';
        });
        group.appendChild(path);
      });
      svg.appendChild(group);
      if (status) {
        const countyText = String(status.textContent || '').split('/')[0].trim() || '159 COUNTIES';
        status.textContent = `${countyText} / ${roads.length} ROAD SEGMENTS`;
      }
    } finally {
      drawing = false;
    }
  }

  function maybeDraw() {
    const svg = document.querySelector('.globe-wrap.local-map-mode [data-local-map-svg]');
    if (svg && !svg.querySelector('[data-local-highways]')) drawRoads();
  }

  setInterval(maybeDraw, 900);
  window.addEventListener('resize', () => setTimeout(drawRoads, 150));
})();
