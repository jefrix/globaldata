(function () {
  const GEORGIA_BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  let drawing = false;
  let lastViewBox = '';
  let resizeTimer = null;

  function route(ref, name, kind, points) {
    return { ref, name, kind, points };
  }

  const HIGHWAYS = [
    route('I-75', 'Interstate 75', 'interstate', [[34.98, -84.95], [34.58, -84.93], [34.27, -84.80], [33.95, -84.55], [33.75, -84.39], [33.25, -84.08], [32.84, -83.64], [32.46, -83.73], [31.90, -83.75], [31.47, -83.52], [30.99, -83.36], [30.63, -83.28]]),
    route('I-85', 'Interstate 85', 'interstate', [[34.98, -83.10], [34.55, -83.53], [34.31, -83.82], [34.04, -84.06], [33.75, -84.39], [33.45, -84.64], [33.15, -84.88], [32.85, -85.18]]),
    route('I-20', 'Interstate 20', 'interstate', [[33.65, -85.13], [33.72, -84.85], [33.75, -84.39], [33.72, -84.04], [33.59, -83.62], [33.53, -83.25], [33.47, -82.00]]),
    route('I-95', 'Interstate 95', 'interstate', [[30.74, -81.65], [31.18, -81.50], [31.55, -81.39], [31.88, -81.28], [32.08, -81.15], [32.32, -81.10], [32.56, -80.99]]),
    route('I-16', 'Interstate 16', 'interstate', [[32.84, -83.64], [32.66, -83.27], [32.54, -82.91], [32.44, -82.52], [32.44, -82.05], [32.25, -81.55], [32.08, -81.10]]),
    route('I-285', 'Interstate 285', 'interstate-loop', [[33.91, -84.43], [33.88, -84.27], [33.77, -84.21], [33.64, -84.33], [33.65, -84.55], [33.79, -84.60], [33.91, -84.43]]),
    route('I-575', 'Interstate 575', 'interstate', [[33.99, -84.53], [34.15, -84.50], [34.24, -84.49], [34.36, -84.45], [34.47, -84.43]]),
    route('I-985', 'Interstate 985', 'interstate', [[34.08, -83.99], [34.18, -83.92], [34.25, -83.86], [34.34, -83.81], [34.41, -83.76]]),
    route('I-185', 'Interstate 185', 'interstate', [[33.05, -84.70], [32.84, -84.84], [32.63, -84.91], [32.46, -84.99]]),
    route('I-520', 'Bobby Jones Expressway', 'interstate-loop', [[33.51, -82.10], [33.45, -82.06], [33.38, -82.00], [33.32, -81.95]]),

    route('US 1', 'Fall Line / East Georgia Corridor', 'major', [[33.47, -82.00], [33.20, -82.25], [32.98, -82.81], [32.60, -82.33], [32.38, -82.59], [31.78, -82.35], [31.21, -82.35]]),
    route('US 17', 'Coastal Highway', 'major', [[32.56, -80.99], [32.08, -81.10], [31.55, -81.28], [31.23, -81.50], [30.74, -81.65]]),
    route('US 19 / GA 400', 'Atlanta to North Georgia Corridor', 'major', [[34.89, -83.97], [34.54, -84.02], [34.21, -84.14], [33.97, -84.35], [33.75, -84.39], [33.25, -84.30], [32.88, -84.31], [32.46, -84.99], [31.58, -84.17], [30.70, -84.86]]),
    route('US 23', 'Northeast to Southeast Georgia', 'major', [[34.98, -83.38], [34.60, -83.76], [33.95, -83.37], [33.77, -84.23], [33.08, -83.25], [32.38, -82.59], [31.61, -81.89], [31.21, -82.35], [30.74, -81.65]]),
    route('US 27', 'Western Georgia Corridor', 'major', [[34.97, -85.25], [34.25, -85.18], [33.58, -85.08], [33.25, -84.92], [32.46, -84.99], [31.58, -84.17], [31.22, -84.20], [30.72, -84.86]]),
    route('US 41', 'Northwest to Middle Georgia Corridor', 'major', [[34.98, -85.25], [34.77, -84.97], [34.27, -84.80], [33.95, -84.55], [33.75, -84.39], [33.25, -84.08], [32.84, -83.64], [32.46, -83.73], [31.47, -83.52], [30.99, -83.36]]),
    route('US 78', 'Atlanta to Athens Corridor', 'major', [[33.72, -84.85], [33.75, -84.39], [33.81, -84.24], [33.89, -84.14], [33.96, -83.99], [33.95, -83.37], [33.77, -82.73], [33.47, -82.00]]),
    route('US 80', 'Columbus to Savannah Corridor', 'major', [[32.46, -84.99], [32.54, -83.89], [32.54, -82.91], [32.44, -82.05], [32.08, -81.10]]),
    route('US 82', 'South Georgia Corridor', 'major', [[31.18, -85.05], [31.58, -84.17], [31.21, -83.25], [31.15, -82.35], [31.23, -81.50]]),
    route('US 84', 'Wiregrass Corridor', 'major', [[30.83, -85.00], [30.84, -83.98], [30.84, -83.27], [31.20, -82.36], [31.21, -81.48]]),
    route('US 129 / US 441', 'North-South Mountain Corridor', 'major', [[34.95, -83.38], [34.60, -83.76], [33.95, -83.37], [33.08, -83.25], [32.84, -83.64], [32.38, -82.59], [31.78, -82.35], [30.84, -83.27]]),
    route('US 280', 'Columbus to Vidalia Corridor', 'major', [[32.46, -84.99], [32.08, -84.23], [31.96, -83.78], [32.04, -83.05], [32.22, -82.41], [32.20, -82.32]]),
    route('US 301', 'Statesboro to Folkston Corridor', 'major', [[32.45, -81.78], [32.08, -82.05], [31.94, -81.93], [31.61, -81.89], [31.21, -82.35], [30.84, -82.00], [30.74, -81.65]]),
    route('US 341', 'Perry to Brunswick Corridor', 'major', [[32.46, -83.73], [32.38, -82.59], [31.87, -82.59], [31.61, -81.89], [31.23, -81.50]]),

    route('GA 21', 'Savannah River Parkway', 'primary', [[33.47, -82.00], [32.95, -81.97], [32.60, -82.06], [32.45, -81.78], [32.08, -81.10]]),
    route('GA 26', 'Middle Georgia East-West Connector', 'primary', [[32.46, -84.99], [32.55, -83.89], [32.54, -82.91], [32.38, -82.59], [32.20, -82.32], [32.08, -81.10]]),
    route('GA 67', 'Statesboro to South Georgia Connector', 'primary', [[32.45, -81.78], [32.20, -81.95], [31.94, -81.93], [31.61, -81.89], [31.21, -82.35]]),
    route('GA 96', 'Columbus to Warner Robins Connector', 'primary', [[32.46, -84.99], [32.55, -84.25], [32.61, -83.62], [32.46, -83.73]]),
    route('GA 121', 'Southeast Georgia Connector', 'primary', [[32.60, -82.33], [32.20, -82.32], [31.78, -82.35], [31.21, -82.35], [30.84, -82.00]]),
    route('GA 204', 'Savannah Southside Corridor', 'primary', [[32.08, -81.10], [31.98, -81.20], [31.90, -81.35], [31.83, -81.50]]),
    route('GA 247', 'Warner Robins Industrial Corridor', 'primary', [[32.84, -83.64], [32.61, -83.62], [32.46, -83.73], [32.30, -83.75]]),
  ];

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
        stroke: #d9e4ef;
        stroke-width: 0.92;
        opacity: 0.9;
        filter: drop-shadow(0 0 0.6px rgba(217,228,239,0.26));
      }
      .local-road.interstate-loop {
        stroke: #d9e4ef;
        stroke-width: 0.78;
        opacity: 0.84;
        filter: drop-shadow(0 0 0.45px rgba(217,228,239,0.22));
      }
      .local-road.major {
        stroke: #6fb4ff;
        stroke-width: 0.62;
        opacity: 0.75;
        filter: drop-shadow(0 0 0.38px rgba(111,180,255,0.2));
      }
      .local-road.primary {
        stroke: #4fe0c8;
        stroke-width: 0.44;
        opacity: 0.54;
        filter: none;
      }
      .local-road:hover {
        stroke: #ffffff;
        stroke-width: 1.25;
        opacity: 1;
        filter: drop-shadow(0 0 1px rgba(255,255,255,0.34));
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
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#d9e4ef;background:#d9e4ef"></i>INTERSTATE</span>',
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#6fb4ff;background:#6fb4ff"></i>MAJOR</span>',
      '<span class="local-map-key"><i class="local-map-swatch" style="color:#4fe0c8;background:#4fe0c8"></i>PRIMARY</span>',
    ].join('');
    const first = foot.firstElementChild;
    if (first) first.replaceWith(legend);
    else foot.prepend(legend);
  }

  function highwaysActive() {
    const apiValue = window.GlobalDataLocalMenu?.getLayer?.('highways');
    if (typeof apiValue === 'boolean') return apiValue;
    return Boolean(document.querySelector('[data-local-menu-layer="highways"].active'));
  }

  function setExistingVisible(active) {
    document.querySelectorAll('[data-local-highways]').forEach(group => {
      group.style.display = active ? '' : 'none';
    });
  }

  function projection(width, height) {
    const pad = Math.max(16, Math.min(width, height) * 0.04);
    const spanLon = GEORGIA_BOUNDS.maxLon - GEORGIA_BOUNDS.minLon;
    const spanLat = GEORGIA_BOUNDS.maxLat - GEORGIA_BOUNDS.minLat;
    const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat);
    const mapW = spanLon * scale;
    const mapH = spanLat * scale;
    const ox = (width - mapW) / 2;
    const oy = (height - mapH) / 2;
    return ([lon, lat]) => [
      ox + (lon - GEORGIA_BOUNDS.minLon) * scale,
      oy + (GEORGIA_BOUNDS.maxLat - lat) * scale,
    ];
  }

  function pathFor(points, project) {
    return points.map((point, index) => {
      const [lat, lon] = point;
      const [x, y] = project([lon, lat]);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }

  function drawRoads(force = false) {
    const wrap = document.querySelector('.globe-wrap.local-map-mode');
    const overlay = wrap?.querySelector('[data-local-map-overlay]');
    const svg = overlay?.querySelector('[data-local-map-svg]');
    const active = highwaysActive();
    if (!active) {
      setExistingVisible(false);
      return;
    }
    if (!wrap || !overlay || !svg || drawing) return;

    const viewBox = svg.getAttribute('viewBox') || '';
    const existing = svg.querySelector('[data-local-highways]');
    if (!force && existing && lastViewBox === viewBox) {
      setExistingVisible(true);
      return;
    }

    drawing = true;
    ensureStyles();
    installLegend(overlay);

    try {
      const box = svg.viewBox?.baseVal;
      const width = Math.max(320, box?.width || svg.getBoundingClientRect().width || 900);
      const height = Math.max(320, box?.height || svg.getBoundingClientRect().height || 620);
      const project = projection(width, height);
      const readout = overlay.querySelector('[data-local-map-readout]');
      const status = overlay.querySelector('[data-local-map-status]');
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const order = { primary: 1, major: 2, 'interstate-loop': 3, interstate: 4 };

      group.dataset.localHighways = '1';
      group.addEventListener('mouseover', event => {
        const path = event.target?.closest?.('.local-road');
        if (!path || !readout) return;
        readout.textContent = `${String(path.dataset.ref || '').toUpperCase()} / ${String(path.dataset.name || '').toUpperCase()}`;
      });
      group.addEventListener('mouseout', event => {
        if (!event.target?.closest?.('.local-road') || !readout) return;
        readout.textContent = 'STATEWIDE';
      });

      svg.querySelectorAll('[data-local-highways]').forEach(node => node.remove());
      [...HIGHWAYS].sort((a, b) => (order[a.kind] || 0) - (order[b.kind] || 0)).forEach(road => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `local-road ${road.kind || 'primary'}`);
        path.setAttribute('d', pathFor(road.points, project));
        path.dataset.ref = road.ref || road.name || 'HWY';
        path.dataset.name = road.name || road.ref || 'Georgia Highway';
        group.appendChild(path);
      });
      svg.appendChild(group);
      lastViewBox = viewBox;
      if (status) {
        const countyText = String(status.textContent || '').split('/')[0].trim() || '159 COUNTIES';
        status.textContent = `${countyText} / ${HIGHWAYS.length} ROAD ROUTES`;
      }
    } finally {
      drawing = false;
    }
  }

  function maybeDraw() {
    const svg = document.querySelector('.globe-wrap.local-map-mode [data-local-map-svg]');
    if (!svg) return;
    if (!highwaysActive()) {
      setExistingVisible(false);
      return;
    }
    if (!svg.querySelector('[data-local-highways]')) drawRoads();
    else setExistingVisible(true);
  }

  setInterval(maybeDraw, 1200);
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.querySelector('.globe-wrap.local-map-mode') && highwaysActive()) drawRoads(true);
    }, 250);
  });
})();
