(function () {
  function ensureStyles() {
    if (document.querySelector('[data-local-atlas-style]')) return;
    const style = document.createElement('style');
    style.dataset.localAtlasStyle = '1';
    style.textContent = `
      .local-atlas-selected {
        stroke: #ffffff !important;
        stroke-width: 2.1 !important;
        filter: drop-shadow(0 0 5px rgba(255,255,255,0.78)) !important;
      }
      .local-city-dot.local-atlas-selected,
      .local-park-point.local-atlas-selected {
        fill: #ffffff !important;
      }
      .local-lake.local-atlas-selected {
        fill: rgba(255,255,255,0.30) !important;
      }
      .local-atlas-inspector .insp-note {
        margin-top: 10px;
        color: var(--text-dim);
        font-size: 11px;
        line-height: 1.45;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function formatNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : '--';
  }

  function numberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function row(label, value, color) {
    const style = color ? ` style="color:${escapeHtml(color)}"` : '';
    return `<div class="insp-row"><span>${escapeHtml(label)}</span><b${style}>${escapeHtml(value || '--')}</b></div>`;
  }

  function restaurantAmenityQuery(areaName, featureType) {
    if (!areaName || !['city', 'county'].includes(featureType)) return null;
    const safeName = String(areaName).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const targetName = featureType === 'county' && !/county$/i.test(safeName) ? `${safeName} County` : safeName;
    return [
      '[out:json][timeout:25];',
      'area["ISO3166-2"="US-GA"]["boundary"="administrative"]["admin_level"="4"]->.ga;',
      `area["name"="${targetName}"]["boundary"="administrative"](area.ga)->.target;`,
      '(',
      '  node["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](area.target);',
      '  way["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](area.target);',
      '  relation["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](area.target);',
      ');',
      'out count;',
    ].join('\n');
  }

  function resetInspector(panel) {
    panel.className = 'inspector empty';
    panel.innerHTML = [
      '<div class="insp-hd">INSPECTOR</div>',
      '<div class="insp-empty">SELECT A GLOBE OBJECT<br><span>OR CLICK AN EVENT FEED ITEM</span></div>',
    ].join('');
  }

  function renderInspector(detail) {
    const panel = document.querySelector('.rail-right .inspector');
    if (!panel) return;
    const featureType = detail.featureType || 'feature';
    const hasRestaurantArea = featureType === 'city' || featureType === 'county';
    const estimate = detail.population ? Math.max(4, Math.round(Number(detail.population) / 850)) : null;
    const restaurantText = hasRestaurantArea
      ? (estimate ? `~${formatNumber(estimate)} EST. / COUNTING` : 'COUNTING LIVE MAP DATA')
      : 'NOT A RESTAURANT AREA';

    panel.className = 'inspector active local-atlas-inspector';
    panel.innerHTML = [
      '<div class="insp-hd">',
      '<span>LOCAL ATLAS</span>',
      '<button data-local-atlas-close type="button">x</button>',
      '</div>',
      '<div class="insp-body">',
      `<div class="insp-title">${escapeHtml(detail.title || detail.name || 'Georgia Feature')}</div>`,
      '<div class="heat-bar"><div class="heat-fill" style="width:100%;background:#73ff9a"></div></div>',
      row('TYPE', String(featureType).toUpperCase()),
      detail.population ? row('POPULATION', formatNumber(detail.population)) : '',
      detail.kind ? row('CLASS', String(detail.kind).toUpperCase()) : '',
      detail.routeRef ? row('ROUTE', detail.routeRef) : '',
      detail.lat && detail.lon ? row('COORD', `${Number(detail.lat).toFixed(3)}, ${Number(detail.lon).toFixed(3)}`) : '',
      detail.area ? row('AREA', detail.area) : '',
      row('RESTAURANTS', restaurantText, hasRestaurantArea ? '#f5d142' : '#7a94b8'),
      row('AMERIPRO', 'CLIENT LIST PENDING', '#5bd7ff'),
      row('SERVICED', '0 LOADED', '#5bd7ff'),
      row('SALES USE', hasRestaurantArea ? 'TARGETABLE MARKET AREA' : 'REFERENCE LAYER'),
      row('SOURCE', detail.source || 'LOCAL ATLAS'),
      detail.note ? `<div class="insp-note">${escapeHtml(detail.note)}</div>` : '',
      '</div>',
    ].join('');

    panel.querySelector('[data-local-atlas-close]')?.addEventListener('click', () => resetInspector(panel));
    if (hasRestaurantArea) updateRestaurantCount(detail, panel);
  }

  function updateRestaurantCount(detail, panel) {
    const query = restaurantAmenityQuery(detail.name, detail.featureType);
    const valueNode = [...panel.querySelectorAll('.insp-row')]
      .find(node => node.querySelector('span')?.textContent === 'RESTAURANTS')
      ?.querySelector('b');
    if (!query || !valueNode) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }).toString(),
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error(`restaurant count HTTP ${response.status}`);
        return response.json();
      })
      .then(payload => {
        const total = (payload.elements || []).reduce((sum, element) => {
          const tags = element.tags || {};
          return sum + Number(tags.total || tags.nodes || tags.ways || tags.relations || 0);
        }, 0);
        valueNode.textContent = formatNumber(total);
        valueNode.style.color = '#7bd6a8';
      })
      .catch(() => {
        if (!valueNode.textContent.includes('EST.')) valueNode.textContent = 'COUNT UNAVAILABLE';
      })
      .finally(() => clearTimeout(timeout));
  }

  function dataFromTarget(target) {
    const city = target.closest?.('[data-city-name]');
    if (city) {
      return {
        featureType: 'city',
        name: city.dataset.name || city.dataset.cityName,
        title: city.dataset.name || city.dataset.cityName,
        population: numberOrNull(city.dataset.population),
        lat: numberOrNull(city.dataset.lat),
        lon: numberOrNull(city.dataset.lon),
        source: 'LOCAL CITY LAYER',
        note: city.dataset.serviceArea === 'true' ? 'AmeriPro service-area hub highlighted for sales planning.' : 'Municipality with population above 3,000.',
      };
    }

    const featureType = target.dataset.featureType || (
      target.classList.contains('local-county') || target.classList.contains('local-fallback-point') ? 'county' :
      target.classList.contains('local-lake') ? 'lake' :
      target.classList.contains('local-water-line') ? 'river' :
      target.classList.contains('local-park-zone') || target.classList.contains('local-park-point') ? 'park' :
      target.classList.contains('local-road') ? 'highway' :
      null
    );
    if (!featureType) return null;

    const nearbyName = target.previousElementSibling?.dataset?.name || target.nextElementSibling?.dataset?.name;
    const name = target.dataset.name || target.dataset.countyName || target.dataset.routeRef || nearbyName || 'Georgia Feature';
    const detail = {
      featureType,
      name,
      title: featureType === 'county' ? `${name} County` : name,
      lat: numberOrNull(target.dataset.lat),
      lon: numberOrNull(target.dataset.lon),
      kind: target.dataset.kind || '',
      routeRef: target.dataset.routeRef || '',
      source: 'LOCAL ATLAS',
    };

    if (featureType === 'county') {
      detail.fips = target.dataset.fips || '';
      detail.note = 'County boundary from the Georgia county map. Restaurant count uses live OpenStreetMap business listings when available.';
    } else if (featureType === 'lake') {
      detail.area = target.dataset.area || 'Lake / reservoir feature';
      detail.note = 'Water reference layer for local route and territory planning.';
    } else if (featureType === 'river' || featureType === 'waterway') {
      detail.note = 'River or coastal waterway reference layer.';
    } else if (featureType === 'park') {
      detail.note = 'Public land reference point for local orientation.';
    } else if (featureType === 'highway') {
      detail.note = 'Transportation corridor useful for route planning and service territory review.';
    }
    return detail;
  }

  function selectFeature(target, detail) {
    document.querySelectorAll('.local-atlas-selected').forEach(node => node.classList.remove('local-atlas-selected'));
    target.classList.add('local-atlas-selected');
    renderInspector(detail);
    window.dispatchEvent(new CustomEvent('globaldata:local-select', { detail }));
  }

  function onClick(event) {
    const target = event.target.closest?.([
      '.local-county',
      '.local-fallback-point',
      '.local-city-dot',
      '.local-city-orbit',
      '.local-lake',
      '.local-water-line',
      '.local-park-zone',
      '.local-park-point',
      '.local-road',
    ].join(','));
    if (!target || !target.closest('[data-local-map-svg]')) return;
    const detail = dataFromTarget(target);
    if (!detail) return;
    event.stopPropagation();
    selectFeature(target, detail);
  }

  ensureStyles();
  document.addEventListener('click', onClick, true);
})();
