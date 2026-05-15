(function () {
  const BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const MAX_POWER_PLANTS = 140;
  const POWER_COLORS = {
    nuclear: '#ffe66d',
    hydro: '#5bd7ff',
    solar: '#ffd84d',
    wind: '#9ad4ff',
    coal: '#ff8f3d',
    gas: '#b38cff',
    oil: '#f5b142',
    biomass: '#73ff9a',
    waste: '#d6ff4f',
    battery: '#4fd1ff',
    storage: '#4fd1ff',
    other: '#d9e4ef',
  };

  const STRATEGIC_INFRASTRUCTURE = [
    { id: 'ga-air-atl', kind: 'airport', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', county: 'Clayton / Fulton', lat: 33.6407, lon: -84.4277, operator: 'City of Atlanta Department of Aviation', status: 'Global passenger and air cargo hub', sourceName: 'ATL', sourceUrl: 'https://www.atl.com/' },
    { id: 'ga-port-savannah', kind: 'port', name: 'Port of Savannah / Garden City Terminal', city: 'Savannah', county: 'Chatham', lat: 32.1287, lon: -81.1519, operator: 'Georgia Ports Authority', status: 'Major U.S. container gateway', sourceName: 'Georgia Ports Authority', sourceUrl: 'https://gaports.com/facilities/port-of-savannah/' },
    { id: 'ga-port-brunswick', kind: 'port', name: 'Port of Brunswick', city: 'Brunswick', county: 'Glynn', lat: 31.1499, lon: -81.4915, operator: 'Georgia Ports Authority', status: 'Roll-on/roll-off and breakbulk port', sourceName: 'Georgia Ports Authority', sourceUrl: 'https://gaports.com/facilities/port-of-brunswick/' },
    { id: 'ga-rail-inman', kind: 'rail', name: 'Inman Yard', city: 'Atlanta', county: 'Fulton', lat: 33.7934, lon: -84.4517, operator: 'Norfolk Southern', status: 'Major Atlanta rail yard / intermodal corridor', sourceName: 'Norfolk Southern / public rail map', sourceUrl: 'https://www.norfolksouthern.com/' },
    { id: 'ga-rail-fairburn', kind: 'intermodal', name: 'Fairburn Intermodal Terminal', city: 'Fairburn', county: 'Fulton', lat: 33.5671, lon: -84.5810, operator: 'CSX', status: 'Metro Atlanta intermodal freight terminal', sourceName: 'CSX Intermodal Terminals', sourceUrl: 'https://www.csx.com/' },
  ];

  const GEORGIA_DATA_CENTERS = [
    { id: 'dc-qts-atl1', name: 'QTS Atlanta 1', owner: 'QTS Data Centers', operator: 'QTS', type: 'Hyperscale / colocation campus', city: 'Atlanta', county: 'Fulton', lat: 33.782, lon: -84.426, powerMw: 278, powerLabel: '278 MW gross utility power campus disclosure', facilitySize: '990,000 sq ft across 99 acres', network: 'Carrier-rich Atlanta westside campus', status: 'Operational / expanding', sourceName: 'QTS Atlanta 1', sourceUrl: 'https://q.com/data-centers/atlanta-1/' },
    { id: 'dc-qts-suwanee', name: 'QTS Suwanee', owner: 'QTS Data Centers', operator: 'QTS', type: 'Enterprise / colocation data center', city: 'Suwanee', county: 'Gwinnett', lat: 34.026, lon: -84.050, powerLabel: 'Public capacity not fully disclosed', facilitySize: 'Metro Atlanta data center campus', network: 'Atlanta metro fiber and enterprise colocation', status: 'Operational', sourceName: 'QTS Georgia locations', sourceUrl: 'https://q.com/data-centers/' },
    { id: 'dc-qts-fayetteville', name: 'QTS Fayetteville Campus', owner: 'QTS Data Centers', operator: 'QTS', type: 'Hyperscale campus', city: 'Fayetteville', county: 'Fayette', lat: 33.449, lon: -84.455, powerLabel: 'Public IT load not fully disclosed', facilitySize: 'Georgia hyperscale campus', network: 'Atlanta metro cloud corridor', status: 'Development / phased campus', sourceName: 'QTS Fayetteville', sourceUrl: 'https://q.com/data-centers/fayetteville/' },
    { id: 'dc-qts-augusta', name: 'QTS Augusta Campus', owner: 'QTS Data Centers', operator: 'QTS', type: 'Hyperscale campus', city: 'Augusta', county: 'Richmond', lat: 33.474, lon: -82.011, powerLabel: 'Public IT load not fully disclosed', facilitySize: 'Augusta data center campus', network: 'East Georgia cloud corridor', status: 'Development / phased campus', sourceName: 'QTS Augusta', sourceUrl: 'https://q.com/data-centers/augusta/' },
    { id: 'dc-google-douglas', name: 'Google Douglas County Data Center', owner: 'Google', operator: 'Google', type: 'Cloud data center campus', city: 'Douglasville', county: 'Douglas', lat: 33.748, lon: -84.663, powerLabel: 'Public IT load not disclosed', computeCapacity: 'Google cloud/search infrastructure; exact compute undisclosed', facilitySize: 'Multi-building data center campus', network: 'Google private backbone / Atlanta metro fiber', status: 'Operational / expanding', sourceName: 'Google Data Centers Georgia', sourceUrl: 'https://datacenters.google/locations/georgia/' },
    { id: 'dc-meta-stanton-springs', name: 'Meta Stanton Springs Data Center', owner: 'Meta', operator: 'Meta', type: 'Hyperscale social/AI data center', city: 'Social Circle', county: 'Newton', lat: 33.628, lon: -83.674, powerLabel: 'Public IT load not disclosed', computeCapacity: 'Meta production and AI infrastructure; exact fleet undisclosed', facilitySize: 'Stanton Springs campus', network: 'Regional fiber / utility-scale campus', status: 'Operational / expanding', sourceName: 'Meta data centers', sourceUrl: 'https://datacenters.atmeta.com/' },
    { id: 'dc-databank-atl1', name: 'DataBank ATL1', owner: 'DataBank', operator: 'DataBank', type: 'Carrier hotel / colocation', city: 'Atlanta', county: 'Fulton', lat: 33.776, lon: -84.389, powerLabel: 'Public capacity not fully disclosed', facilitySize: 'Downtown Atlanta colocation facility', network: 'Carrier hotel / peering-rich downtown Atlanta', status: 'Operational', sourceName: 'DataBank ATL1', sourceUrl: 'https://www.databank.com/data-centers/atlanta/' },
    { id: 'dc-digital-realty-atl', name: 'Digital Realty Atlanta Metro', owner: 'Digital Realty', operator: 'Digital Realty', type: 'Carrier-neutral colocation', city: 'Atlanta', county: 'Fulton', lat: 33.758, lon: -84.391, powerLabel: 'Public site capacities vary by facility', facilitySize: 'Atlanta metro colocation portfolio', network: '56 Marietta / downtown carrier ecosystem', status: 'Operational', sourceName: 'Digital Realty Atlanta', sourceUrl: 'https://www.digitalrealty.com/data-centers/americas/atlanta' },
    { id: 'dc-equinix-at1', name: 'Equinix AT1 Atlanta IBX', owner: 'Equinix', operator: 'Equinix', type: 'IBX colocation / interconnection', city: 'Atlanta', county: 'Fulton', lat: 33.759, lon: -84.388, powerLabel: 'Public site capacity not fully disclosed', facilitySize: 'Downtown Atlanta IBX', network: 'Equinix Fabric / enterprise interconnection', status: 'Operational', sourceName: 'Equinix Atlanta AT1', sourceUrl: 'https://www.equinix.com/data-centers/americas-colocation/united-states-colocation/atlanta-data-centers/at1' },
    { id: 'dc-dcblox-atl', name: 'DC BLOX Atlanta Metro', owner: 'DC BLOX', operator: 'DC BLOX', type: 'Regional data center / cloud connectivity', city: 'Atlanta', county: 'Fulton', lat: 33.749, lon: -84.388, powerLabel: 'Public capacity not fully disclosed', facilitySize: 'Atlanta metro data center footprint', network: 'Southeast cloud, fiber, and connectivity platform', status: 'Operational / regional platform', sourceName: 'DC BLOX Atlanta', sourceUrl: 'https://www.dcblox.com/' },
  ];

  let lastViewBox = '';
  let selectedId = null;
  let manualState = { infrastructure: false, dataCenters: false };

  function ensureStyle() {
    if (document.querySelector('[data-local-infra-style]')) return;
    const style = document.createElement('style');
    style.dataset.localInfraStyle = '1';
    style.textContent = `
      .local-placeholder-layer[data-local-placeholder="infrastructure"] .local-placeholder-badge,
      .local-placeholder-layer[data-local-placeholder="dataCenters"] .local-placeholder-badge {
        display: none;
      }
      .local-infra-group,
      .local-dc-group {
        pointer-events: auto;
      }
      .local-infra-marker,
      .local-dc-marker {
        cursor: pointer;
        vector-effect: non-scaling-stroke;
        stroke: rgba(4,14,28,0.94);
        stroke-width: 0.9;
        filter: drop-shadow(0 0 3px var(--local-glow, rgba(255,216,77,0.55)));
      }
      .local-infra-ring,
      .local-dc-ring {
        fill: none;
        stroke: var(--local-color, #ffd84d);
        stroke-width: 0.75;
        vector-effect: non-scaling-stroke;
        opacity: 0.58;
        pointer-events: none;
      }
      .local-dc-marker {
        fill: #5bd7ff;
        stroke: rgba(255,255,255,0.86);
        filter: drop-shadow(0 0 4px rgba(91,215,255,0.72));
      }
      .local-infra-marker.selected,
      .local-dc-marker.selected {
        stroke: #ffffff;
        stroke-width: 2.1;
        filter: drop-shadow(0 0 7px rgba(255,255,255,0.82));
      }
      .local-infra-hit,
      .local-dc-hit {
        fill: transparent;
        stroke: transparent;
        cursor: pointer;
        pointer-events: all;
      }
      .local-infra-label,
      .local-dc-label {
        font-family: var(--mono);
        font-size: 7.4px;
        letter-spacing: 0.07em;
        fill: rgba(224,238,255,0.88);
        text-anchor: middle;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.80);
        stroke-width: 2.5;
        pointer-events: none;
      }
      .local-dc-label {
        fill: #bfefff;
      }
      .local-infra-inspector .news-actions {
        margin-top: 10px;
      }
      .local-info-popup {
        position: fixed;
        z-index: 80;
        width: min(330px, calc(100vw - 28px));
        border: 1px solid rgba(91,215,255,0.62);
        background: rgba(4,14,28,0.96);
        box-shadow: 0 0 22px rgba(91,215,255,0.22), inset 0 0 18px rgba(91,215,255,0.06);
        color: var(--text);
        font-family: var(--mono);
        letter-spacing: 0.08em;
        padding: 10px 12px;
        pointer-events: auto;
      }
      .local-info-popup[hidden] {
        display: none;
      }
      .local-info-popup-title {
        color: #ffffff;
        font-size: 12px;
        line-height: 1.25;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .local-info-popup-row {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        border-top: 1px solid rgba(91,215,255,0.16);
        padding: 5px 0;
        font-size: 9px;
        line-height: 1.35;
      }
      .local-info-popup-row span {
        color: var(--text-dim);
        flex: 0 0 auto;
      }
      .local-info-popup-row b {
        color: #d9e4ef;
        text-align: right;
        font-weight: 500;
      }
      .local-info-popup-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      .local-info-popup-actions a,
      .local-info-popup-actions button {
        border: 1px solid rgba(91,215,255,0.45);
        background: rgba(91,215,255,0.08);
        color: #5bd7ff;
        font: inherit;
        font-size: 8.5px;
        letter-spacing: 0.12em;
        text-decoration: none;
        padding: 5px 7px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function powerTypeKey(value) {
    const key = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
    if (key.includes('nuclear')) return 'nuclear';
    if (key.includes('hydro')) return 'hydro';
    if (key.includes('solar')) return 'solar';
    if (key.includes('wind')) return 'wind';
    if (key.includes('coal')) return 'coal';
    if (key.includes('gas')) return 'gas';
    if (key.includes('oil') || key.includes('petroleum')) return 'oil';
    if (key.includes('biomass')) return 'biomass';
    if (key.includes('waste')) return 'waste';
    if (key.includes('battery') || key.includes('storage')) return 'battery';
    return 'other';
  }

  function powerColor(plant) {
    return POWER_COLORS[powerTypeKey(plant.generationType || plant.primaryFuel || plant.fuel || plant.technology)] || POWER_COLORS.other;
  }

  function georgiaPowerPlants() {
    const plants = window.GLOBALDATA_NORTH_AMERICA_POWER || window.GLOBALDATA_INFRASTRUCTURE?.powerPlants || [];
    return plants
      .filter(plant => String(plant.state || '').toUpperCase() === 'GA' || /Georgia/i.test(String(plant.region || plant.country || '')))
      .filter(plant => Number.isFinite(Number(plant.lat)) && Number.isFinite(Number(plant.lon)))
      .sort((a, b) => Number(b.capacityMw || b.capacity_mw || 0) - Number(a.capacityMw || a.capacity_mw || 0))
      .slice(0, MAX_POWER_PLANTS)
      .map(plant => ({
        ...plant,
        layerType: 'powerPlant',
        kind: powerTypeKey(plant.generationType || plant.primaryFuel || plant.fuel || plant.technology),
        sourceName: plant.sourceName || plant.source || plant.dataset || 'Public power plant dataset',
      }));
  }

  function infrastructureItems() {
    return [
      ...georgiaPowerPlants(),
      ...STRATEGIC_INFRASTRUCTURE.map(item => ({ ...item, layerType: 'asset' })),
    ];
  }

  function localMapActive() {
    return Boolean(document.querySelector('.globe-wrap.local-map-mode'));
  }

  function placeholderActive(name) {
    const apiValue = window.GlobalDataLocalMenu?.getLayer?.(name);
    if (typeof apiValue === 'boolean') return Boolean(apiValue && localMapActive());
    const node = document.querySelector(`[data-local-placeholder="${name}"]`);
    return Boolean(localMapActive() && (manualState[name] || (node && node.style.display !== 'none')));
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

  function markerRadius(item) {
    if (item.layerType === 'asset') return item.kind === 'airport' || item.kind === 'port' ? 5.6 : 4.5;
    const mw = Number(item.capacityMw || item.capacity_mw || 0);
    return Math.max(2.4, Math.min(7.2, 2.1 + Math.sqrt(Math.max(0, mw)) / 23));
  }

  function shouldLabelInfrastructure(item) {
    if (item.layerType === 'asset') return true;
    const mw = Number(item.capacityMw || item.capacity_mw || 0);
    return mw >= 900 || item.kind === 'nuclear';
  }

  function pointColor(item) {
    if (item.layerType === 'asset') {
      if (item.kind === 'airport') return '#d9e4ef';
      if (item.kind === 'port') return '#5bd7ff';
      if (item.kind === 'rail' || item.kind === 'intermodal') return '#ff8f3d';
      return '#ffd84d';
    }
    return powerColor(item);
  }

  function itemTitle(item) {
    return item.name || item.owner || item.id || 'Georgia infrastructure';
  }

  function setReadout(text) {
    const readout = document.querySelector('[data-local-map-readout]');
    if (readout) readout.textContent = text || 'STATEWIDE';
  }

  function addLabel(group, text, x, y, radius, className) {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', className);
    label.setAttribute('x', x.toFixed(2));
    label.setAttribute('y', (y - radius - 4).toFixed(2));
    label.textContent = String(text || '').toUpperCase();
    group.appendChild(label);
  }

  function drawInfrastructure(svg, project) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localInfrastructure = '1';
    group.classList.add('local-infra-group');

    infrastructureItems().forEach(item => {
      const [x, y] = project([Number(item.lon), Number(item.lat)]);
      const color = pointColor(item);
      const radius = markerRadius(item);
      const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

      wrap.dataset.localInfraItem = item.id || item.name;
      ring.setAttribute('class', 'local-infra-ring');
      ring.style.setProperty('--local-color', color);
      ring.setAttribute('cx', x.toFixed(2));
      ring.setAttribute('cy', y.toFixed(2));
      ring.setAttribute('r', (radius * 1.75).toFixed(2));

      marker.setAttribute('class', `local-infra-marker ${selectedId === item.id ? 'selected' : ''}`);
      marker.setAttribute('cx', x.toFixed(2));
      marker.setAttribute('cy', y.toFixed(2));
      marker.setAttribute('r', radius.toFixed(2));
      marker.setAttribute('fill', color);
      marker.style.setProperty('--local-glow', `${color}99`);
      marker.dataset.localFeatureId = item.id || item.name;
      hit.setAttribute('class', 'local-infra-hit');
      hit.setAttribute('cx', x.toFixed(2));
      hit.setAttribute('cy', y.toFixed(2));
      hit.setAttribute('r', Math.max(11, radius * 2.1).toFixed(2));
      hit.dataset.localFeatureId = item.id || item.name;

      const activate = event => {
        event.stopPropagation();
        selectedId = item.id || item.name;
        showInfoPopup(item, item.layerType === 'powerPlant' ? 'powerPlant' : 'infrastructure', event, true);
        emitRailPick(item, item.layerType === 'powerPlant' ? 'powerPlant' : 'infrastructure');
        renderInspectorFallback(item, item.layerType === 'powerPlant' ? 'powerPlant' : 'infrastructure');
        refreshSelection();
      };
      const preview = event => {
        setReadout(`${String(item.kind || item.generationType || 'ASSET').toUpperCase()} / ${itemTitle(item).toUpperCase()}`);
        showInfoPopup(item, item.layerType === 'powerPlant' ? 'powerPlant' : 'infrastructure', event, false);
      };
      const move = event => moveInfoPopup(event);
      const leave = () => {
        setReadout(null);
        hideInfoPopup(false);
      };
      [marker, hit].forEach(node => {
        node.addEventListener('mouseenter', preview);
        node.addEventListener('mousemove', move);
        node.addEventListener('mouseleave', leave);
        node.addEventListener('click', activate);
      });

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = itemTitle(item);
      marker.appendChild(title);
      wrap.appendChild(hit);
      wrap.appendChild(ring);
      wrap.appendChild(marker);
      group.appendChild(wrap);
      if (shouldLabelInfrastructure(item)) addLabel(group, item.name, x, y, radius, 'local-infra-label');
    });

    svg.appendChild(group);
  }

  function drawDataCenters(svg, project) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localDataCenters = '1';
    group.classList.add('local-dc-group');

    GEORGIA_DATA_CENTERS.forEach(dc => {
      const [x, y] = project([Number(dc.lon), Number(dc.lat)]);
      const power = Number(dc.powerMw);
      const size = Number.isFinite(power) ? Math.max(5.5, Math.min(10, 5.3 + Math.log10(power + 1) * 1.45)) : 5.8;
      const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

      wrap.dataset.localDcItem = dc.id;
      ring.setAttribute('class', 'local-dc-ring');
      ring.style.setProperty('--local-color', '#5bd7ff');
      ring.setAttribute('x', (x - size * 0.86).toFixed(2));
      ring.setAttribute('y', (y - size * 0.86).toFixed(2));
      ring.setAttribute('width', (size * 1.72).toFixed(2));
      ring.setAttribute('height', (size * 1.72).toFixed(2));

      marker.setAttribute('class', `local-dc-marker ${selectedId === dc.id ? 'selected' : ''}`);
      marker.setAttribute('x', (x - size / 2).toFixed(2));
      marker.setAttribute('y', (y - size / 2).toFixed(2));
      marker.setAttribute('width', size.toFixed(2));
      marker.setAttribute('height', size.toFixed(2));
      marker.dataset.localFeatureId = dc.id;
      hit.setAttribute('class', 'local-dc-hit');
      hit.setAttribute('x', (x - Math.max(11, size * 1.35)).toFixed(2));
      hit.setAttribute('y', (y - Math.max(11, size * 1.35)).toFixed(2));
      hit.setAttribute('width', (Math.max(22, size * 2.7)).toFixed(2));
      hit.setAttribute('height', (Math.max(22, size * 2.7)).toFixed(2));
      hit.dataset.localFeatureId = dc.id;

      const activate = event => {
        event.stopPropagation();
        selectedId = dc.id;
        showInfoPopup(dc, 'dataCenter', event, true);
        emitRailPick(dc, 'dataCenter');
        renderInspectorFallback(dc, 'dataCenter');
        refreshSelection();
      };
      const preview = event => {
        setReadout(`DATA CENTER / ${dc.name.toUpperCase()}`);
        showInfoPopup(dc, 'dataCenter', event, false);
      };
      const move = event => moveInfoPopup(event);
      const leave = () => {
        setReadout(null);
        hideInfoPopup(false);
      };
      [marker, hit].forEach(node => {
        node.addEventListener('mouseenter', preview);
        node.addEventListener('mousemove', move);
        node.addEventListener('mouseleave', leave);
        node.addEventListener('click', activate);
      });

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = dc.name;
      marker.appendChild(title);
      wrap.appendChild(hit);
      wrap.appendChild(ring);
      wrap.appendChild(marker);
      group.appendChild(wrap);
      if (dc.powerMw || /QTS|Google|Meta|DataBank|Equinix/i.test(dc.name)) addLabel(group, dc.name, x, y, size / 2, 'local-dc-label');
    });

    svg.appendChild(group);
  }

  function redraw(svg) {
    const project = projectFactory(svg);
    svg.querySelectorAll('[data-local-infrastructure], [data-local-data-centers]').forEach(node => node.remove());
    drawInfrastructure(svg, project);
    drawDataCenters(svg, project);
  }

  function refreshSelection() {
    document.querySelectorAll('.local-infra-marker.selected, .local-dc-marker.selected').forEach(node => node.classList.remove('selected'));
    if (selectedId) document.querySelector(`[data-local-feature-id="${cssEscape(selectedId)}"]`)?.classList.add('selected');
  }

  function syncLayers() {
    const svg = document.querySelector('.globe-wrap.local-map-mode [data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const viewBox = svg.getAttribute('viewBox') || '';
    if (viewBox !== lastViewBox || !svg.querySelector('[data-local-infrastructure]') || !svg.querySelector('[data-local-data-centers]')) {
      lastViewBox = viewBox;
      redraw(svg);
    }

    const infraActive = placeholderActive('infrastructure');
    const dcActive = placeholderActive('dataCenters');
    svg.querySelectorAll('[data-local-infrastructure]').forEach(node => { node.style.display = infraActive ? '' : 'none'; });
    svg.querySelectorAll('[data-local-data-centers]').forEach(node => { node.style.display = dcActive ? '' : 'none'; });

    const infraSub = document.querySelector('[data-local-menu-layer="infrastructure"] .layer-sub');
    if (infraSub) {
      const plantCount = georgiaPowerPlants().length;
      infraSub.textContent = `${plantCount} POWER GEN / ${STRATEGIC_INFRASTRUCTURE.length} ASSETS`;
    }
    const dcSub = document.querySelector('[data-local-menu-layer="dataCenters"] .layer-sub');
    if (dcSub) dcSub.textContent = `${GEORGIA_DATA_CENTERS.length} GA DATA CENTERS`;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function formatMw(value) {
    const mw = Number(value);
    return Number.isFinite(mw) && mw > 0 ? `${Math.round(mw).toLocaleString()} MW` : String(value || '--');
  }

  function locationText(item) {
    if (item.city && item.county) return `${item.city}, ${item.county} County`;
    if (item.city) return `${item.city}, GA`;
    if (item.county) return `${item.county} County, ${item.state || 'GA'}`;
    return item.state || 'GA';
  }

  function detailRows(item, kind) {
    if (kind === 'dataCenter') {
      return [
        ['OWNER', item.owner || '--'],
        ['OPERATOR', item.operator || item.owner || '--'],
        ['POWER', item.powerLabel || formatMw(item.powerMw)],
        ['COMPUTE', item.computeCapacity || 'Not publicly disclosed'],
        ['FACILITY', item.facilitySize || '--'],
        ['NETWORK', item.network || '--'],
        ['STATUS', item.status || '--'],
        ['SOURCE', item.sourceName || item.source || 'Public source'],
      ];
    }
    return [
      ['OWNER', item.owner || item.operator || '--'],
      ['OPERATOR', item.operator || item.owner || '--'],
      ['TYPE', String(item.kind || item.generationType || item.type || 'ASSET').toUpperCase()],
      ['OUTPUT', item.layerType === 'powerPlant' ? formatMw(item.capacityMw || item.capacity_mw) : item.output || item.powerOutput || '--'],
      ['LOCATION', locationText(item)],
      ['STATUS', item.status || item.technology || '--'],
      ['SOURCE', item.sourceName || item.source || item.dataset || 'Public source'],
    ];
  }

  function ensureInfoPopup() {
    let popup = document.querySelector('[data-local-info-popup]');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.className = 'local-info-popup';
    popup.dataset.localInfoPopup = '1';
    popup.hidden = true;
    document.body.appendChild(popup);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') hideInfoPopup(true);
    });
    document.addEventListener('click', event => {
      if (!popup.dataset.pinned || popup.hidden || popup.contains(event.target) || event.target.closest?.('.local-infra-hit,.local-dc-hit,.local-infra-marker,.local-dc-marker')) return;
      hideInfoPopup(true);
    }, true);
    return popup;
  }

  function popupHtml(item, kind) {
    const color = kind === 'dataCenter' ? '#5bd7ff' : pointColor(item);
    const rows = detailRows(item, kind)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([label, value]) => `<div class="local-info-popup-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`)
      .join('');
    const sourceUrl = item.sourceUrl || item.regulatorUrl || '';
    return [
      `<div class="local-info-popup-title" style="color:${color}">${escapeHtml(item.name || 'Georgia Asset')}</div>`,
      rows,
      '<div class="local-info-popup-actions">',
      '<button type="button" data-local-popup-close>CLOSE</button>',
      sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">SOURCE</a>` : '<span></span>',
      '</div>',
    ].join('');
  }

  function placeInfoPopup(popup, event) {
    const pad = 14;
    const x = Number(event?.clientX) || window.innerWidth / 2;
    const y = Number(event?.clientY) || window.innerHeight / 2;
    const rect = popup.getBoundingClientRect();
    let left = x + 18;
    let top = y + 18;
    if (left + rect.width + pad > window.innerWidth) left = x - rect.width - 18;
    if (top + rect.height + pad > window.innerHeight) top = y - rect.height - 18;
    popup.style.left = `${Math.max(pad, left)}px`;
    popup.style.top = `${Math.max(pad, top)}px`;
  }

  function showInfoPopup(item, kind, event, pinned) {
    const popup = ensureInfoPopup();
    popup.innerHTML = popupHtml(item, kind);
    popup.hidden = false;
    popup.dataset.pinned = pinned ? '1' : '';
    popup.querySelector('[data-local-popup-close]')?.addEventListener('click', () => hideInfoPopup(true));
    placeInfoPopup(popup, event);
  }

  function moveInfoPopup(event) {
    const popup = document.querySelector('[data-local-info-popup]');
    if (!popup || popup.hidden || popup.dataset.pinned) return;
    placeInfoPopup(popup, event);
  }

  function hideInfoPopup(force) {
    const popup = document.querySelector('[data-local-info-popup]');
    if (!popup || (!force && popup.dataset.pinned)) return;
    popup.hidden = true;
    popup.dataset.pinned = '';
  }

  function renderInspectorFallback(item, kind) {
    const panel = document.querySelector('.rail-right .inspector');
    if (!panel) return;
    const color = kind === 'dataCenter' ? '#5bd7ff' : pointColor(item);
    const rows = detailRows(item, kind)
      .map(([label, value]) => `<div class="insp-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || '--')}</b></div>`)
      .join('');
    const sourceUrl = item.sourceUrl || item.regulatorUrl || '';
    panel.className = 'inspector active local-infra-inspector';
    panel.innerHTML = [
      '<div class="insp-hd">',
      `<span>${kind === 'dataCenter' ? 'LOCAL DATA CENTER' : 'LOCAL INFRASTRUCTURE'}</span>`,
      '<button data-local-infra-close type="button">x</button>',
      '</div>',
      '<div class="insp-body">',
      `<div class="insp-title" style="color:${color}">${escapeHtml(item.name || 'Georgia Asset')}</div>`,
      `<div class="heat-bar"><div class="heat-fill" style="width:100%;background:${color}"></div></div>`,
      rows,
      sourceUrl ? `<div class="news-actions"><a class="news-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">OPEN SOURCE</a></div>` : '',
      '</div>',
    ].join('');
    panel.querySelector('[data-local-infra-close]')?.addEventListener('click', () => {
      panel.className = 'inspector empty';
      panel.innerHTML = [
        '<div class="insp-hd">INSPECTOR</div>',
        '<div class="insp-empty">SELECT A GLOBE OBJECT<br><span>OR CLICK AN EVENT FEED ITEM</span></div>',
      ].join('');
      hideInfoPopup(true);
    });
  }

  function emitRailPick(item, kind) {
    const detail = {
      kind,
      data: item,
      eventId: item.id || item.name,
    };
    if (window.GlobalDataSelectRailPick) window.GlobalDataSelectRailPick(detail);
    else window.dispatchEvent(new CustomEvent('globaldata:rail-pick', { detail }));
  }

  window.GlobalDataLocalInfrastructure = {
    setActive(name, active) {
      if (name === 'infrastructure' || name === 'dataCenters') manualState[name] = Boolean(active);
      syncLayers();
    },
    getActive(name) {
      return placeholderActive(name);
    },
    refresh: () => {
      lastViewBox = '';
      syncLayers();
    },
    dataCenters: GEORGIA_DATA_CENTERS,
    infrastructureItems,
  };

  setInterval(syncLayers, 300);
})();
