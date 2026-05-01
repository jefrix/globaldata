(function () {
  const BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const WATER_LINES = [
    { name: 'Savannah River', pts: [[34.99, -82.59], [34.67, -82.31], [34.32, -82.08], [33.88, -81.77], [33.45, -81.66], [32.93, -81.35], [32.08, -81.09], [31.95, -80.95]] },
    { name: 'Ocmulgee River', pts: [[34.22, -84.40], [33.85, -84.14], [33.55, -83.93], [33.18, -83.86], [32.84, -83.64], [32.54, -83.43], [32.18, -83.18], [31.95, -82.58], [31.80, -82.35]] },
    { name: 'Oconee River', pts: [[34.23, -83.50], [33.96, -83.37], [33.55, -83.26], [33.08, -83.23], [32.62, -83.17], [32.44, -82.94], [32.20, -82.65], [31.98, -82.52]] },
    { name: 'Altamaha River', pts: [[31.98, -82.52], [31.84, -82.27], [31.70, -81.95], [31.55, -81.60], [31.42, -81.28], [31.36, -81.18]] },
    { name: 'Ogeechee River', pts: [[33.45, -82.36], [33.15, -82.20], [32.82, -81.95], [32.55, -81.80], [32.20, -81.48], [31.98, -81.27]] },
    { name: 'Flint River', pts: [[33.65, -84.58], [33.15, -84.57], [32.68, -84.48], [32.20, -84.42], [31.65, -84.35], [31.02, -84.55], [30.72, -84.86]] },
    { name: 'Chattahoochee River', pts: [[34.98, -83.73], [34.40, -84.00], [33.75, -84.56], [33.18, -85.10], [32.46, -84.99], [31.75, -85.10], [31.10, -85.05], [30.72, -84.86]] },
    { name: 'Satilla River', pts: [[31.55, -82.85], [31.25, -82.45], [31.03, -82.05], [30.92, -81.72], [30.98, -81.52]] },
    { name: 'St. Marys River', pts: [[30.74, -82.05], [30.63, -81.88], [30.70, -81.67], [30.72, -81.48]] },
    { name: 'Intracoastal Waterway', coastal: true, pts: [[32.13, -81.12], [31.95, -81.10], [31.62, -81.20], [31.25, -81.36], [30.82, -81.48]] },
  ];
  const LAKES = [
    { name: 'Lake Lanier', lat: 34.23, lon: -83.96, rx: 0.22, ry: 0.15 },
    { name: 'Lake Hartwell', lat: 34.47, lon: -82.88, rx: 0.20, ry: 0.18 },
    { name: 'Lake Allatoona', lat: 34.13, lon: -84.65, rx: 0.18, ry: 0.12 },
    { name: 'Lake Oconee', lat: 33.45, lon: -83.25, rx: 0.16, ry: 0.18 },
    { name: 'Lake Sinclair', lat: 33.18, lon: -83.22, rx: 0.18, ry: 0.12 },
    { name: 'Lake Blackshear', lat: 31.95, lon: -83.93, rx: 0.15, ry: 0.18 },
    { name: 'Lake Seminole', lat: 30.78, lon: -84.78, rx: 0.22, ry: 0.13 },
    { name: 'West Point Lake', lat: 33.02, lon: -85.13, rx: 0.12, ry: 0.20 },
    { name: 'Lake Juliette', lat: 33.05, lon: -83.78, rx: 0.07, ry: 0.11 },
  ];
  const PARKS = [
    { name: 'Okefenokee NWR', lat: 30.74, lon: -82.20, size: 16, kind: 'wildlife' },
    { name: 'Ocmulgee Mounds', lat: 32.84, lon: -83.60, size: 8, kind: 'national' },
    { name: 'Skidaway Island', lat: 31.95, lon: -81.05, size: 7, kind: 'state' },
    { name: 'Fort McAllister', lat: 31.89, lon: -81.20, size: 7, kind: 'state' },
    { name: 'George L. Smith', lat: 32.55, lon: -82.11, size: 7, kind: 'state' },
    { name: 'Magnolia Springs', lat: 32.87, lon: -81.97, size: 7, kind: 'state' },
    { name: 'Little Ocmulgee', lat: 32.10, lon: -82.89, size: 7, kind: 'state' },
    { name: 'General Coffee', lat: 31.51, lon: -82.80, size: 7, kind: 'state' },
    { name: 'Reed Bingham', lat: 31.16, lon: -83.54, size: 7, kind: 'state' },
    { name: 'High Falls', lat: 33.18, lon: -84.02, size: 7, kind: 'state' },
    { name: 'Indian Springs', lat: 33.25, lon: -83.92, size: 7, kind: 'state' },
    { name: 'Providence Canyon', lat: 32.06, lon: -84.92, size: 8, kind: 'state' },
    { name: 'F.D. Roosevelt', lat: 32.84, lon: -84.70, size: 8, kind: 'state' },
    { name: 'Wormsloe', lat: 31.98, lon: -81.07, size: 6, kind: 'historic' },
    { name: 'Fort Pulaski', lat: 32.03, lon: -80.89, size: 7, kind: 'national' },
    { name: 'Amicalola Falls', lat: 34.56, lon: -84.25, size: 7, kind: 'state' },
    { name: 'Tallulah Gorge', lat: 34.74, lon: -83.39, size: 7, kind: 'state' },
    { name: 'Cloudland Canyon', lat: 34.84, lon: -85.48, size: 7, kind: 'state' },
    { name: 'Vogel', lat: 34.77, lon: -83.93, size: 7, kind: 'state' },
  ];
  let lastViewBox = '';

  function ensureStyle() {
    if (document.querySelector('[data-local-natural-style]')) return;
    const style = document.createElement('style');
    style.dataset.localNaturalStyle = '1';
    style.textContent = `
      .local-water-line {
        fill: none;
        stroke: #5bd7ff;
        stroke-width: 1.05;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        opacity: 0.86;
        filter: drop-shadow(0 0 2px rgba(91,215,255,0.58));
      }
      .local-water-line.coastal {
        stroke: #9ad4ff;
        stroke-width: 1.25;
        stroke-dasharray: 2.5 3.5;
      }
      .local-lake {
        fill: rgba(91,215,255,0.30);
        stroke: rgba(154,212,255,0.92);
        stroke-width: 0.9;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 2px rgba(91,215,255,0.45));
      }
      .local-park-zone {
        fill: rgba(123,214,168,0.13);
        stroke: rgba(123,214,168,0.75);
        stroke-width: 0.9;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 2px rgba(123,214,168,0.32));
      }
      .local-park-point {
        fill: #7bd6a8;
        stroke: rgba(0,0,0,0.85);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
      .local-feature-label {
        font-family: var(--mono);
        font-size: 7.8px;
        letter-spacing: 0.07em;
        fill: rgba(207,226,255,0.78);
        text-anchor: middle;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.72);
        stroke-width: 2.4;
        pointer-events: none;
      }
      .local-placeholder-layer[data-local-placeholder="water"] .local-placeholder-badge,
      .local-placeholder-layer[data-local-placeholder="parks"] .local-placeholder-badge {
        display: none;
      }
    `;
    document.head.appendChild(style);
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

  function linePath(points, project) {
    return points.map(([lat, lon], index) => {
      const [x, y] = project([lon, lat]);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }

  function ellipsePath(feature, project) {
    const [cx, cy] = project([feature.lon, feature.lat]);
    const [rxX] = project([feature.lon + feature.rx, feature.lat]);
    const [, ryY] = project([feature.lon, feature.lat + feature.ry]);
    const rx = Math.abs(rxX - cx);
    const ry = Math.abs(ryY - cy);
    return `M${(cx - rx).toFixed(2)} ${cy.toFixed(2)}a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(rx * 2).toFixed(2)} 0a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(-rx * 2).toFixed(2)} 0`;
  }

  function markerDiamond(x, y, size) {
    const s = size / 2;
    return `M${x.toFixed(2)} ${(y - s).toFixed(2)}L${(x + s).toFixed(2)} ${y.toFixed(2)}L${x.toFixed(2)} ${(y + s).toFixed(2)}L${(x - s).toFixed(2)} ${y.toFixed(2)}Z`;
  }

  function addText(group, className, text, x, y) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', className);
    label.setAttribute('x', x.toFixed(2));
    label.setAttribute('y', y.toFixed(2));
    label.textContent = text.toUpperCase();
    group.appendChild(label);
  }

  function insertBeforeReference(svg, group, kind) {
    const ref = kind === 'water'
      ? svg.querySelector('[data-local-counties], [data-local-highways]')
      : svg.querySelector('[data-local-highways]');
    if (ref) svg.insertBefore(group, ref);
    else svg.appendChild(group);
  }

  function drawWater(svg, project) {
    svg.querySelectorAll('[data-local-water]').forEach(node => node.remove());
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localWater = '1';

    LAKES.forEach(lake => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'local-lake');
      path.setAttribute('d', ellipsePath(lake, project));
      path.dataset.name = lake.name;
      group.appendChild(path);
    });

    WATER_LINES.forEach(river => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', `local-water-line ${river.coastal ? 'coastal' : ''}`);
      path.setAttribute('d', linePath(river.pts, project));
      path.dataset.name = river.name;
      group.appendChild(path);
    });

    [
      { name: 'Lanier', lat: 34.23, lon: -83.96 },
      { name: 'Oconee', lat: 33.45, lon: -83.25 },
      { name: 'Altamaha', lat: 31.68, lon: -81.95 },
      { name: 'Savannah R.', lat: 32.52, lon: -81.22 },
    ].forEach(item => {
      const [x, y] = project([item.lon, item.lat]);
      addText(group, 'local-feature-label', item.name, x, y - 5);
    });

    insertBeforeReference(svg, group, 'water');
  }

  function drawParks(svg, project) {
    svg.querySelectorAll('[data-local-parks]').forEach(node => node.remove());
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localParks = '1';

    PARKS.forEach(park => {
      const [x, y] = project([park.lon, park.lat]);
      const zone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      zone.setAttribute('class', 'local-park-zone');
      zone.setAttribute('d', markerDiamond(x, y, park.size * 2.6));
      zone.dataset.name = park.name;
      group.appendChild(zone);

      const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      point.setAttribute('class', 'local-park-point');
      point.setAttribute('cx', x.toFixed(2));
      point.setAttribute('cy', y.toFixed(2));
      point.setAttribute('r', Math.max(2.2, park.size * 0.28).toFixed(2));
      group.appendChild(point);
    });

    [
      { name: 'Okefenokee', lat: 30.74, lon: -82.20 },
      { name: 'Ocmulgee', lat: 32.84, lon: -83.60 },
      { name: 'Skidaway', lat: 31.95, lon: -81.05 },
      { name: 'Little Ocmulgee', lat: 32.10, lon: -82.89 },
      { name: 'George L Smith', lat: 32.55, lon: -82.11 },
    ].forEach(item => {
      const [x, y] = project([item.lon, item.lat]);
      addText(group, 'local-feature-label', item.name, x, y - 8);
    });

    insertBeforeReference(svg, group, 'parks');
  }

  function placeholderActive(name) {
    const node = document.querySelector(`[data-local-placeholder="${name}"]`);
    return Boolean(node && node.style.display !== 'none');
  }

  function syncLayers() {
    const svg = document.querySelector('[data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const viewBox = svg.getAttribute('viewBox') || '';
    const waterExists = Boolean(svg.querySelector('[data-local-water]'));
    const parksExists = Boolean(svg.querySelector('[data-local-parks]'));
    if (viewBox !== lastViewBox || !waterExists || !parksExists) {
      lastViewBox = viewBox;
      const project = projectFactory(svg);
      drawWater(svg, project);
      drawParks(svg, project);
    }

    const waterOn = placeholderActive('water');
    const parksOn = placeholderActive('parks');
    svg.querySelectorAll('[data-local-water]').forEach(node => { node.style.display = waterOn ? '' : 'none'; });
    svg.querySelectorAll('[data-local-parks]').forEach(node => { node.style.display = parksOn ? '' : 'none'; });

    const waterSub = document.querySelector('[data-local-menu-layer="water"] .layer-sub');
    if (waterSub) waterSub.textContent = 'RIVERS / LAKES / COAST';
    const parksSub = document.querySelector('[data-local-menu-layer="parks"] .layer-sub');
    if (parksSub) parksSub.textContent = 'STATE / NATIONAL PARKS';
  }

  setInterval(syncLayers, 300);
})();
