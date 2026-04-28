(function () {
  const STATIC_MODE_HOSTS = ['jefrix.github.io'];

  if (!STATIC_MODE_HOSTS.includes(window.location.hostname)) return;

  const originalFetch = window.fetch.bind(window);

  if (window.MOCK_DATA) {
    window.MOCK_DATA.news = [];
    window.MOCK_DATA.flights = [];
    window.MOCK_DATA.vessels = [];
    window.MOCK_DATA.SHIPPING = [];
  }

  const countryCenters = {
    global: { lat: 20, lon: 0, city: 'Global', country: 'GLOBAL' },
    africa: { lat: 1.5, lon: 17.5, city: 'Africa', country: 'AFRICA' },
    china: { lat: 35.9, lon: 104.2, city: 'China', country: 'CHN' },
    france: { lat: 46.2, lon: 2.2, city: 'France', country: 'FRA' },
    germany: { lat: 51.2, lon: 10.4, city: 'Germany', country: 'DEU' },
    india: { lat: 20.6, lon: 78.9, city: 'India', country: 'IND' },
    iran: { lat: 32.4, lon: 53.7, city: 'Iran', country: 'IRN' },
    israel: { lat: 31.0, lon: 35.0, city: 'Israel', country: 'ISR' },
    japan: { lat: 36.2, lon: 138.3, city: 'Japan', country: 'JPN' },
    korea: { lat: 36.5, lon: 127.8, city: 'Korea', country: 'KOR' },
    russia: { lat: 61.5, lon: 105.3, city: 'Russia', country: 'RUS' },
    ukraine: { lat: 49.0, lon: 31.4, city: 'Ukraine', country: 'UKR' },
    'united states': { lat: 39.8, lon: -98.6, city: 'United States', country: 'USA' },
    usa: { lat: 39.8, lon: -98.6, city: 'United States', country: 'USA' },
    washington: { lat: 38.9, lon: -77.0, city: 'Washington', country: 'USA' },
    'united kingdom': { lat: 54.2, lon: -2.5, city: 'United Kingdom', country: 'GBR' },
  };

  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  async function getJson(url) {
    const response = await originalFetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function sourceResult(name, ok, data, error) {
    return { name, ok, count: Array.isArray(data) ? data.length : 0, error };
  }

  function newsLocation(title) {
    const text = String(title || '').toLowerCase();
    const match = Object.entries(countryCenters).find(([name]) => name !== 'global' && text.includes(name));
    return match ? match[1] : countryCenters.global;
  }

  function normalizeLines(geometry) {
    const lines = [];
    if (!geometry) return lines;
    if (geometry.type === 'LineString') lines.push(geometry.coordinates);
    if (geometry.type === 'MultiLineString') geometry.coordinates.forEach(line => lines.push(line));
    return lines
      .map(line => line
        .map(([lon, lat]) => [Number(lat), Number(lon)])
        .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)))
      .filter(line => line.length > 1);
  }

  function centroid(geometry) {
    const points = [];
    const walk = coords => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        points.push({ lon: coords[0], lat: coords[1] });
        return;
      }
      coords.forEach(walk);
    };
    walk(geometry && geometry.coordinates);
    if (!points.length) return null;
    const sum = points.reduce((acc, point) => ({
      lat: acc.lat + point.lat,
      lon: acc.lon + point.lon,
    }), { lat: 0, lon: 0 });
    return { lat: sum.lat / points.length, lon: sum.lon / points.length };
  }

  async function loadNews() {
    const url = 'https://en.wikinews.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Published&cmtype=page&cmprop=ids|title|timestamp&cmsort=timestamp&cmdir=desc&cmlimit=40&format=json&origin=*';
    const data = await getJson(url);
    return (data.query && data.query.categorymembers || []).map(item => {
      const located = newsLocation(item.title);
      return {
        id: `wikinews-${item.pageid}`,
        lat: located.lat,
        lon: located.lon,
        city: located.city,
        country: located.country,
        title: item.title,
        category: 'NEWS',
        source: 'wikinews.org',
        sourceName: 'Wikinews',
        officialSource: true,
        url: `https://en.wikinews.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        sources: 1,
        ts: item.timestamp ? Date.parse(item.timestamp) : Date.now(),
      };
    }).filter(item => item.title);
  }

  async function loadEarthquakes() {
    const data = await getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    return (data.features || []).map(feature => {
      const [lon, lat, depth] = feature.geometry && feature.geometry.coordinates || [];
      const props = feature.properties || {};
      return {
        id: feature.id,
        type: 'earthquake',
        lat,
        lon,
        depth,
        mag: props.mag,
        place: props.place,
        title: props.title,
        ts: props.time,
        url: props.url,
        severity: props.alert || (props.mag >= 5 ? 'orange' : props.mag >= 4 ? 'yellow' : 'green'),
      };
    }).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon));
  }

  async function loadWeather() {
    const data = await getJson('https://api.weather.gov/alerts/active?status=actual');
    return (data.features || []).map(feature => {
      const props = feature.properties || {};
      const center = centroid(feature.geometry);
      if (!center) return null;
      return {
        id: feature.id,
        type: 'weather',
        lat: center.lat,
        lon: center.lon,
        title: props.event || 'Weather alert',
        area: props.areaDesc,
        severity: props.severity,
        urgency: props.urgency,
        certainty: props.certainty,
        ts: props.sent ? Date.parse(props.sent) : Date.now(),
        expires: props.expires,
        url: props['@id'],
      };
    }).filter(Boolean);
  }

  async function loadShippingLanes() {
    const data = await getJson('https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/main/data/Shipping_Lanes_v1.geojson');
    const lanes = [];
    (data.features || []).forEach((feature, index) => {
      const type = feature.properties && (feature.properties.Type || feature.properties.type) || 'Route';
      normalizeLines(feature.geometry).forEach((points, part) => {
        lanes.push({ id: `shipping-${index}-${part}`, type, pts: points });
      });
    });
    return lanes.slice(0, 260);
  }

  async function loadPorts() {
    const data = await getJson('https://raw.githubusercontent.com/tayljordan/ports/main/ports.json');
    return (Array.isArray(data) ? data : [])
      .map((port, index) => ({
        id: `port-${index}`,
        name: port.CITY || port.city || 'Port',
        state: port.STATE || port.state,
        country: port.COUNTRY || port.country,
        lat: Number(port.LATITUDE || port.latitude),
        lon: Number(port.LONGITUDE || port.longitude),
        source: 'tayljordan/ports',
      }))
      .filter(port => Number.isFinite(port.lat) && Number.isFinite(port.lon))
      .slice(0, 1200);
  }

  async function settle(name, loader) {
    try {
      const data = await loader();
      return { name, ok: true, data };
    } catch (error) {
      return { name, ok: false, data: [], error: error.message };
    }
  }

  async function staticPayload() {
    const results = await Promise.all([
      settle('news', loadNews),
      settle('earthquakes', loadEarthquakes),
      settle('weather', loadWeather),
      settle('shippingLanes', loadShippingLanes),
      settle('ports', loadPorts),
    ]);
    const byName = Object.fromEntries(results.map(result => [result.name, result]));
    return {
      generatedAt: Date.now(),
      sources: [
        ...results.map(result => sourceResult(result.name, result.ok, result.data, result.error)),
        sourceResult('flights', false, [], 'Requires a deployed live API; browser CORS blocks ADS-B feeds'),
        sourceResult('vessels', false, [], 'Requires a deployed AIS backend; synthetic vessels disabled'),
      ],
      flights: [],
      news: byName.news.data,
      shippingLanes: byName.shippingLanes.data,
      ports: byName.ports.data,
      vessels: [],
      militaryBases: [],
      militaryShips: [],
      conflictEvents: [],
      aisstream: [],
      earthquakes: byName.earthquakes.data,
      weather: byName.weather.data,
      kasperskyCyber: [],
      cached: false,
      staticPageFallback: true,
    };
  }

  let payloadPromise = null;
  window.fetch = function (input, options) {
    const url = typeof input === 'string' ? input : input && input.url;
    if (/^http:\/\/localhost:30(00|01|09)\/api\/live/.test(String(url || ''))) {
      payloadPromise = payloadPromise || staticPayload();
      return payloadPromise.then(jsonResponse);
    }
    return originalFetch(input, options);
  };
})();
