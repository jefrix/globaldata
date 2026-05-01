(function () {
  const BOUNDS = { minLon: -85.62, maxLon: -80.84, minLat: 30.36, maxLat: 35.01 };
  const MIN_POPULATION = 3000;
  const CITIES = [
    { name: 'Atlanta', pop: 510823, lat: 33.7490, lon: -84.3880 },
    { name: 'Columbus', pop: 206922, lat: 32.4610, lon: -84.9877 },
    { name: 'Augusta', pop: 202096, lat: 33.4735, lon: -82.0105 },
    { name: 'Macon', pop: 157346, lat: 32.8407, lon: -83.6324, service: true },
    { name: 'Savannah', pop: 148004, lat: 32.0809, lon: -81.0912, service: true },
    { name: 'Athens', pop: 128561, lat: 33.9519, lon: -83.3576 },
    { name: 'Sandy Springs', pop: 108080, lat: 33.9304, lon: -84.3733 },
    { name: 'South Fulton', pop: 107436, lat: 33.6269, lon: -84.5800 },
    { name: 'Roswell', pop: 92833, lat: 34.0232, lon: -84.3616 },
    { name: 'Johns Creek', pop: 82453, lat: 34.0289, lon: -84.1986 },
    { name: 'Warner Robins', pop: 82175, lat: 32.6130, lon: -83.6242, service: true },
    { name: 'Mableton', pop: 78000, lat: 33.8187, lon: -84.5824 },
    { name: 'Albany', pop: 68509, lat: 31.5785, lon: -84.1557 },
    { name: 'Alpharetta', pop: 66836, lat: 34.0754, lon: -84.2941 },
    { name: 'Marietta', pop: 60972, lat: 33.9526, lon: -84.5499 },
    { name: 'Stonecrest', pop: 59636, lat: 33.7085, lon: -84.1349 },
    { name: 'Smyrna', pop: 55989, lat: 33.8839, lon: -84.5144 },
    { name: 'Valdosta', pop: 55961, lat: 30.8327, lon: -83.2785 },
    { name: 'Brookhaven', pop: 55293, lat: 33.8651, lon: -84.3366 },
    { name: 'Dunwoody', pop: 51683, lat: 33.9462, lon: -84.3346 },
    { name: 'Gainesville', pop: 44700, lat: 34.2979, lon: -83.8241 },
    { name: 'Newnan', pop: 42900, lat: 33.3807, lon: -84.7997 },
    { name: 'Peachtree Corners', pop: 42108, lat: 33.9699, lon: -84.2216 },
    { name: 'Milton', pop: 41156, lat: 34.1322, lon: -84.3007 },
    { name: 'Peachtree City', pop: 38500, lat: 33.3968, lon: -84.5958 },
    { name: 'East Point', pop: 38358, lat: 33.6796, lon: -84.4394 },
    { name: 'Rome', pop: 37391, lat: 34.2570, lon: -85.1647 },
    { name: 'Tucker', pop: 37300, lat: 33.8545, lon: -84.2171 },
    { name: 'Woodstock', pop: 36300, lat: 34.1015, lon: -84.5194 },
    { name: 'Hinesville', pop: 35100, lat: 31.8469, lon: -81.5959 },
    { name: 'Douglasville', pop: 35000, lat: 33.7515, lon: -84.7477 },
    { name: 'Dalton', pop: 34417, lat: 34.7698, lon: -84.9702 },
    { name: 'Canton', pop: 34600, lat: 34.2368, lon: -84.4908 },
    { name: 'Statesboro', pop: 33900, lat: 32.4488, lon: -81.7832, service: true },
    { name: 'Kennesaw', pop: 33700, lat: 34.0234, lon: -84.6155 },
    { name: 'Duluth', pop: 31600, lat: 34.0029, lon: -84.1446 },
    { name: 'LaGrange', pop: 31200, lat: 33.0393, lon: -85.0313 },
    { name: 'Lawrenceville', pop: 31000, lat: 33.9562, lon: -83.9879 },
    { name: 'Chamblee', pop: 31000, lat: 33.8920, lon: -84.2988 },
    { name: 'Stockbridge', pop: 29700, lat: 33.5443, lon: -84.2338 },
    { name: 'McDonough', pop: 29500, lat: 33.4473, lon: -84.1469 },
    { name: 'Pooler', pop: 29200, lat: 32.1155, lon: -81.2471 },
    { name: 'Union City', pop: 27000, lat: 33.5871, lon: -84.5424 },
    { name: 'Carrollton', pop: 27400, lat: 33.5801, lon: -85.0766 },
    { name: 'Sugar Hill', pop: 25000, lat: 34.1065, lon: -84.0335 },
    { name: 'Decatur', pop: 24600, lat: 33.7748, lon: -84.2963 },
    { name: 'Cartersville', pop: 24100, lat: 34.1651, lon: -84.7999 },
    { name: 'Griffin', pop: 23800, lat: 33.2468, lon: -84.2641 },
    { name: 'Perry', pop: 23700, lat: 32.4582, lon: -83.7316 },
    { name: 'Snellville', pop: 22500, lat: 33.8573, lon: -84.0199 },
    { name: 'Suwanee', pop: 22200, lat: 34.0515, lon: -84.0713 },
    { name: 'Acworth', pop: 22900, lat: 34.0659, lon: -84.6769 },
    { name: 'Forest Park', pop: 19600, lat: 33.6221, lon: -84.3691 },
    { name: 'Fayetteville', pop: 19000, lat: 33.4487, lon: -84.4549 },
    { name: 'Winder', pop: 18400, lat: 33.9926, lon: -83.7202 },
    { name: 'Thomasville', pop: 18800, lat: 30.8366, lon: -83.9788 },
    { name: 'St. Marys', pop: 18700, lat: 30.7305, lon: -81.5465 },
    { name: 'Milledgeville', pop: 17800, lat: 33.0801, lon: -83.2321 },
    { name: 'Villa Rica', pop: 17900, lat: 33.7321, lon: -84.9191 },
    { name: 'Norcross', pop: 17400, lat: 33.9412, lon: -84.2135 },
    { name: 'Conyers', pop: 17400, lat: 33.6676, lon: -84.0177 },
    { name: 'Tifton', pop: 17200, lat: 31.4505, lon: -83.5085 },
    { name: 'Calhoun', pop: 17000, lat: 34.5026, lon: -84.9511 },
    { name: 'Holly Springs', pop: 17300, lat: 34.1737, lon: -84.5013 },
    { name: 'Buford', pop: 17500, lat: 34.1207, lon: -84.0044 },
    { name: 'Fairburn', pop: 16600, lat: 33.5671, lon: -84.5810 },
    { name: 'Americus', pop: 16000, lat: 32.0724, lon: -84.2327 },
    { name: 'Powder Springs', pop: 16000, lat: 33.8595, lon: -84.6838 },
    { name: 'Dublin', pop: 15900, lat: 32.5404, lon: -82.9038, service: true },
    { name: 'Riverdale', pop: 15600, lat: 33.5726, lon: -84.4133 },
    { name: 'Brunswick', pop: 15100, lat: 31.1499, lon: -81.4915 },
    { name: 'Monroe', pop: 15000, lat: 33.7948, lon: -83.7132 },
    { name: 'Braselton', pop: 15000, lat: 34.1093, lon: -83.7627 },
    { name: 'Dallas', pop: 14900, lat: 33.9237, lon: -84.8408 },
    { name: 'Covington', pop: 14800, lat: 33.5968, lon: -83.8602 },
    { name: 'Loganville', pop: 14800, lat: 33.8390, lon: -83.9007 },
    { name: 'Lilburn', pop: 14800, lat: 33.8901, lon: -84.1429 },
    { name: 'Clarkston', pop: 14700, lat: 33.8095, lon: -84.2396 },
    { name: 'Moultrie', pop: 14700, lat: 31.1799, lon: -83.7891 },
    { name: 'Bainbridge', pop: 14200, lat: 30.9038, lon: -84.5755 },
    { name: 'Waycross', pop: 13900, lat: 31.2136, lon: -82.3540 },
    { name: 'Jefferson', pop: 13700, lat: 34.1171, lon: -83.5724 },
    { name: 'College Park', pop: 13400, lat: 33.6534, lon: -84.4494 },
    { name: 'Douglas', pop: 11600, lat: 31.5088, lon: -82.8499 },
    { name: 'Fort Oglethorpe', pop: 10800, lat: 34.9489, lon: -85.2569 },
    { name: 'Flowery Branch', pop: 10600, lat: 34.1851, lon: -83.9252 },
    { name: 'Doraville', pop: 10500, lat: 33.8982, lon: -84.2833 },
    { name: 'Cordele', pop: 10500, lat: 31.9635, lon: -83.7824 },
    { name: 'Lovejoy', pop: 10400, lat: 33.4362, lon: -84.3144 },
    { name: 'Vidalia', pop: 10300, lat: 32.2177, lon: -82.4135 },
    { name: 'Cedartown', pop: 10200, lat: 34.0112, lon: -85.2559 },
    { name: 'Cairo', pop: 10000, lat: 30.8776, lon: -84.2013 },
    { name: 'Jesup', pop: 9800, lat: 31.6074, lon: -81.8854 },
    { name: 'Toccoa', pop: 9200, lat: 34.5773, lon: -83.3324 },
    { name: 'Fitzgerald', pop: 9200, lat: 31.7149, lon: -83.2527 },
    { name: 'Hampton', pop: 8500, lat: 33.3871, lon: -84.2829 },
    { name: 'Fort Valley', pop: 8500, lat: 32.5538, lon: -83.8874 },
    { name: 'Austell', pop: 7700, lat: 33.8126, lon: -84.6344 },
    { name: 'Dahlonega', pop: 7600, lat: 34.5261, lon: -83.9844 },
    { name: 'Auburn', pop: 7600, lat: 34.0137, lon: -83.8277 },
    { name: 'Tyrone', pop: 7400, lat: 33.4712, lon: -84.5972 },
    { name: 'Swainsboro', pop: 7400, lat: 32.5974, lon: -82.3337 },
    { name: 'Bremen', pop: 7400, lat: 33.7212, lon: -85.1455 },
    { name: 'Commerce', pop: 7200, lat: 34.2037, lon: -83.4571 },
    { name: 'Dacula', pop: 7200, lat: 33.9887, lon: -83.8977 },
    { name: 'Stone Mountain', pop: 6700, lat: 33.8082, lon: -84.1702 },
    { name: 'Hapeville', pop: 6500, lat: 33.6601, lon: -84.4102 },
    { name: 'Morrow', pop: 6500, lat: 33.5832, lon: -84.3394 },
    { name: 'Sylvester', pop: 5900, lat: 31.5307, lon: -83.8355 },
    { name: 'Sandersville', pop: 5600, lat: 32.9815, lon: -82.8101 },
    { name: 'Adel', pop: 5500, lat: 31.1374, lon: -83.4235 },
    { name: 'Temple', pop: 5300, lat: 33.7371, lon: -85.0324 },
    { name: 'Camilla', pop: 5200, lat: 31.2313, lon: -84.2105 },
    { name: 'Palmetto', pop: 5200, lat: 33.5179, lon: -84.6697 },
    { name: 'Oakwood', pop: 5200, lat: 34.2276, lon: -83.8844 },
    { name: 'Eastman', pop: 5200, lat: 32.1977, lon: -83.1777 },
    { name: 'Cochran', pop: 5100, lat: 32.3868, lon: -83.3546 },
    { name: 'Blakely', pop: 5000, lat: 31.3777, lon: -84.9341 },
    { name: 'Baxley', pop: 5000, lat: 31.7783, lon: -82.3485 },
    { name: 'Adairsville', pop: 5000, lat: 34.3687, lon: -84.9341 },
    { name: 'Cornelia', pop: 4900, lat: 34.5115, lon: -83.5271 },
    { name: 'Nashville', pop: 4800, lat: 31.2074, lon: -83.2501 },
    { name: 'Grayson', pop: 4800, lat: 33.8943, lon: -83.9557 },
    { name: 'Jasper', pop: 4700, lat: 34.4679, lon: -84.4291 },
    { name: 'Jonesboro', pop: 4700, lat: 33.5215, lon: -84.3538 },
    { name: 'Euharlee', pop: 4700, lat: 34.1448, lon: -84.9344 },
    { name: 'Rockmart', pop: 4700, lat: 34.0026, lon: -85.0416 },
    { name: 'Hartwell', pop: 4500, lat: 34.3529, lon: -82.9321 },
    { name: 'Summerville', pop: 4400, lat: 34.4806, lon: -85.3477 },
    { name: 'Lyons', pop: 4300, lat: 32.2044, lon: -82.3218 },
    { name: 'Hazlehurst', pop: 4200, lat: 31.8696, lon: -82.5943 },
    { name: 'Metter', pop: 4200, lat: 32.3971, lon: -82.0601 },
    { name: 'Ashburn', pop: 4100, lat: 31.7058, lon: -83.6532 },
    { name: 'Dawson', pop: 4100, lat: 31.7735, lon: -84.4466 },
    { name: 'Glennville', pop: 3800, lat: 31.9366, lon: -81.9287 },
    { name: 'Ringgold', pop: 3700, lat: 34.9159, lon: -85.1091 },
    { name: 'Avondale Estates', pop: 3600, lat: 33.7715, lon: -84.2671 },
    { name: 'Dawsonville', pop: 3800, lat: 34.4212, lon: -84.1191 },
    { name: 'Cuthbert', pop: 3400, lat: 31.7713, lon: -84.7894 },
    { name: 'Soperton', pop: 3100, lat: 32.3771, lon: -82.5924 },
  ].filter(city => city.pop > MIN_POPULATION);

  let lastViewBox = '';

  function ensureStyle() {
    if (document.querySelector('[data-local-cities-style]')) return;
    const style = document.createElement('style');
    style.dataset.localCitiesStyle = '1';
    style.textContent = `
      .local-city-orbit {
        fill: rgba(207,226,255,0.08);
        stroke: rgba(207,226,255,0.38);
        stroke-width: 0.75;
        vector-effect: non-scaling-stroke;
        opacity: 0.78;
      }
      .local-city-dot {
        fill: rgba(207,226,255,0.88);
        stroke: rgba(4,14,28,0.92);
        stroke-width: 0.85;
        vector-effect: non-scaling-stroke;
        filter: drop-shadow(0 0 2px rgba(207,226,255,0.62));
      }
      .local-city-dot.major {
        fill: #ff8a3d;
        stroke: rgba(255,255,255,0.82);
        filter: drop-shadow(0 0 4px rgba(255,138,61,0.78));
      }
      .local-city-dot.service {
        fill: #5bd7ff;
        stroke: rgba(255,255,255,0.88);
        filter: drop-shadow(0 0 4px rgba(91,215,255,0.86));
      }
      .local-city-label {
        font-family: var(--mono);
        font-size: 7.4px;
        letter-spacing: 0.07em;
        fill: rgba(224,238,255,0.88);
        text-anchor: middle;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.78);
        stroke-width: 2.5;
        pointer-events: none;
      }
      .local-placeholder-layer[data-local-placeholder="cities"] .local-placeholder-badge {
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

  function cityRadius(population) {
    return Math.max(2.1, Math.min(17, Math.sqrt(population) / 42));
  }

  function shouldLabel(city) {
    return city.service || city.pop >= 50000 || [
      'Gainesville',
      'Rome',
      'LaGrange',
      'Brunswick',
      'Tifton',
      'Douglas',
      'Perry',
      'Waycross',
      'Milledgeville',
    ].includes(city.name);
  }

  function addLabel(group, city, x, y, radius) {
    if (!shouldLabel(city)) return;
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'local-city-label');
    label.setAttribute('x', x.toFixed(2));
    label.setAttribute('y', (y - radius - 3.8).toFixed(2));
    label.textContent = city.name.toUpperCase();
    group.appendChild(label);
  }

  function drawCities(svg, project) {
    svg.querySelectorAll('[data-local-cities]').forEach(node => node.remove());
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.localCities = '1';

    CITIES.forEach(city => {
      const [x, y] = project([city.lon, city.lat]);
      const radius = cityRadius(city.pop);
      const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      wrap.dataset.cityName = city.name;
      wrap.dataset.population = String(city.pop);

      if (city.pop >= 30000 || city.service) {
        const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        orbit.setAttribute('class', 'local-city-orbit');
        orbit.setAttribute('cx', x.toFixed(2));
        orbit.setAttribute('cy', y.toFixed(2));
        orbit.setAttribute('r', (radius * 1.65).toFixed(2));
        wrap.appendChild(orbit);
      }

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', `local-city-dot ${city.pop >= 100000 ? 'major' : ''} ${city.service ? 'service' : ''}`);
      dot.setAttribute('cx', x.toFixed(2));
      dot.setAttribute('cy', y.toFixed(2));
      dot.setAttribute('r', radius.toFixed(2));

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${city.name}: ${city.pop.toLocaleString()} people`;
      dot.appendChild(title);
      wrap.appendChild(dot);
      group.appendChild(wrap);
      addLabel(group, city, x, y, radius);
    });

    svg.appendChild(group);
  }

  function placeholderActive(name) {
    const node = document.querySelector(`[data-local-placeholder="${name}"]`);
    return Boolean(node && node.style.display !== 'none');
  }

  function syncLayer() {
    const svg = document.querySelector('[data-local-map-svg]');
    if (!svg) return;
    ensureStyle();
    const viewBox = svg.getAttribute('viewBox') || '';
    const exists = Boolean(svg.querySelector('[data-local-cities]'));
    if (viewBox !== lastViewBox || !exists) {
      lastViewBox = viewBox;
      drawCities(svg, projectFactory(svg));
    }

    const active = placeholderActive('cities');
    svg.querySelectorAll('[data-local-cities]').forEach(node => {
      node.style.display = active ? '' : 'none';
    });

    const sub = document.querySelector('[data-local-menu-layer="cities"] .layer-sub');
    if (sub) sub.textContent = `${CITIES.length} CITIES / POP > 3K / SCALED`;
  }

  setInterval(syncLayer, 300);
})();
