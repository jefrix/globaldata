(function () {
  const STATIC_MODE_HOSTS = ['jefrix.github.io'];
  const KASPERSKY_COUNTRIES_URL = 'https://cybermap.kaspersky.com/map/data/countries.json';
  const KASPERSKY_EVENTS_BASE = 'https://sm-cybermap-mediaprod.smweb.tech/data/events/default';
  const POCKETWORLD_FLIGHTS_URL = 'https://pocketworld.org/api/flights';
  const ADSB_LOL_MILITARY_URL = 'https://api.adsb.lol/v2/mil';

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

  const COUNTRY_CENTROIDS = {
    US: { lat: 39.8, lon: -98.6, label: 'United States' },
    USA: { lat: 39.8, lon: -98.6, label: 'United States' },
    QAT: { lat: 25.3, lon: 51.2, label: 'Qatar' },
    CA: { lat: 56.1, lon: -106.3, label: 'Canada' },
    CAN: { lat: 56.1, lon: -106.3, label: 'Canada' },
    MX: { lat: 23.6, lon: -102.5, label: 'Mexico' },
    MEX: { lat: 23.6, lon: -102.5, label: 'Mexico' },
    GB: { lat: 54.2, lon: -2.5, label: 'United Kingdom' },
    GBR: { lat: 54.2, lon: -2.5, label: 'United Kingdom' },
    FR: { lat: 46.2, lon: 2.2, label: 'France' },
    FRA: { lat: 46.2, lon: 2.2, label: 'France' },
    DE: { lat: 51.2, lon: 10.4, label: 'Germany' },
    DEU: { lat: 51.2, lon: 10.4, label: 'Germany' },
    IT: { lat: 42.8, lon: 12.5, label: 'Italy' },
    ITA: { lat: 42.8, lon: 12.5, label: 'Italy' },
    ES: { lat: 40.4, lon: -3.7, label: 'Spain' },
    ESP: { lat: 40.4, lon: -3.7, label: 'Spain' },
    RU: { lat: 61.5, lon: 105.3, label: 'Russia' },
    RUS: { lat: 61.5, lon: 105.3, label: 'Russia' },
    UA: { lat: 49.0, lon: 31.4, label: 'Ukraine' },
    UKR: { lat: 49.0, lon: 31.4, label: 'Ukraine' },
    CN: { lat: 35.9, lon: 104.2, label: 'China' },
    CHN: { lat: 35.9, lon: 104.2, label: 'China' },
    JP: { lat: 36.2, lon: 138.3, label: 'Japan' },
    JPN: { lat: 36.2, lon: 138.3, label: 'Japan' },
    KR: { lat: 36.5, lon: 127.8, label: 'South Korea' },
    KOR: { lat: 36.5, lon: 127.8, label: 'South Korea' },
    IN: { lat: 20.6, lon: 78.9, label: 'India' },
    IND: { lat: 20.6, lon: 78.9, label: 'India' },
    BR: { lat: -14.2, lon: -51.9, label: 'Brazil' },
    BRA: { lat: -14.2, lon: -51.9, label: 'Brazil' },
    AU: { lat: -25.3, lon: 133.8, label: 'Australia' },
    AUS: { lat: -25.3, lon: 133.8, label: 'Australia' },
    ZA: { lat: -30.6, lon: 22.9, label: 'South Africa' },
    ZAF: { lat: -30.6, lon: 22.9, label: 'South Africa' },
    IL: { lat: 31.0, lon: 35.0, label: 'Israel' },
    ISR: { lat: 31.0, lon: 35.0, label: 'Israel' },
    IR: { lat: 32.4, lon: 53.7, label: 'Iran' },
    IRN: { lat: 32.4, lon: 53.7, label: 'Iran' },
    TR: { lat: 39.0, lon: 35.2, label: 'Turkey' },
    TUR: { lat: 39.0, lon: 35.2, label: 'Turkey' },
    AFG: { lat: 33.9, lon: 67.7, label: 'Afghanistan' },
    ALB: { lat: 41.2, lon: 20.2, label: 'Albania' },
    DZA: { lat: 28.0, lon: 1.7, label: 'Algeria' },
    AGO: { lat: -11.2, lon: 17.9, label: 'Angola' },
    ARG: { lat: -38.4, lon: -63.6, label: 'Argentina' },
    ARM: { lat: 40.1, lon: 45.0, label: 'Armenia' },
    AUT: { lat: 47.5, lon: 14.6, label: 'Austria' },
    AZE: { lat: 40.1, lon: 47.6, label: 'Azerbaijan' },
    BGD: { lat: 23.7, lon: 90.4, label: 'Bangladesh' },
    BEL: { lat: 50.5, lon: 4.5, label: 'Belgium' },
    BGR: { lat: 42.7, lon: 25.5, label: 'Bulgaria' },
    CHE: { lat: 46.8, lon: 8.2, label: 'Switzerland' },
    CHL: { lat: -35.7, lon: -71.5, label: 'Chile' },
    COL: { lat: 4.6, lon: -74.3, label: 'Colombia' },
    EGY: { lat: 26.8, lon: 30.8, label: 'Egypt' },
    IDN: { lat: -2.5, lon: 118.0, label: 'Indonesia' },
    KAZ: { lat: 48.0, lon: 67.0, label: 'Kazakhstan' },
    MYS: { lat: 4.2, lon: 102.0, label: 'Malaysia' },
    NLD: { lat: 52.1, lon: 5.3, label: 'Netherlands' },
    NGA: { lat: 9.1, lon: 8.7, label: 'Nigeria' },
    PAK: { lat: 30.4, lon: 69.3, label: 'Pakistan' },
    PHL: { lat: 12.9, lon: 122.8, label: 'Philippines' },
    POL: { lat: 52.0, lon: 19.1, label: 'Poland' },
    ROU: { lat: 45.9, lon: 24.9, label: 'Romania' },
    SAU: { lat: 23.9, lon: 45.1, label: 'Saudi Arabia' },
    SGP: { lat: 1.35, lon: 103.8, label: 'Singapore' },
    THA: { lat: 15.9, lon: 101.0, label: 'Thailand' },
    VNM: { lat: 14.1, lon: 108.3, label: 'Vietnam' },
  };

  const KASPERSKY_TYPES = {
    1: { code: 'OAS', label: 'On-Access Scan', color: '#38b349' },
    2: { code: 'ODS', label: 'On-Demand Scan', color: '#ed1c24' },
    3: { code: 'MAV', label: 'Mail Anti-Virus', color: '#f26522' },
    4: { code: 'WAV', label: 'Web Anti-Virus', color: '#0087f4' },
    5: { code: 'IDS', label: 'Intrusion Detection', color: '#ec008c' },
    6: { code: 'VUL', label: 'Vulnerability Scan', color: '#fbf267' },
    7: { code: 'KAS', label: 'Anti-Spam', color: '#855ff4' },
    9: { code: 'RMW', label: 'Ransomware', color: '#4f5bff' },
  };

  const KASPERSKY_HUBS = [
    { lat: 37.77, lon: -122.42, label: 'San Francisco exchange' },
    { lat: 40.71, lon: -74.01, label: 'New York exchange' },
    { lat: 51.51, lon: -0.13, label: 'London exchange' },
    { lat: 52.52, lon: 13.4, label: 'Berlin exchange' },
    { lat: 1.35, lon: 103.82, label: 'Singapore exchange' },
    { lat: 35.68, lon: 139.69, label: 'Tokyo exchange' },
  ];

  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  async function getJson(url, options = {}) {
    const response = await originalFetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function sourceResult(name, ok, data, error) {
    return { name, ok, count: Array.isArray(data) ? data.length : 0, error };
  }

  function parseLimitFromUrl(url, name, fallback, max) {
    try {
      const parsed = new URL(url);
      const value = Number(parsed.searchParams.get(name));
      if (!Number.isFinite(value)) return fallback;
      return Math.max(0, Math.min(max, Math.floor(value)));
    } catch {
      return fallback;
    }
  }

  function compactText(value) {
    return String(value || '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const sportsNewsWords = /\b(sport|sports|soccer|football|basketball|baseball|hockey|tennis|golf|cricket|rugby|olympic|olympics|fifa|uefa|nba|nfl|mlb|nhl|wnba|ncaa|premier league|champions league|world cup|super bowl|grand slam|playoff|playoffs|matchday|tournament|stadium|coach|quarterback|striker|goalkeeper|pitcher)\b/i;
  const strategicNewsWords = /\b(finance|financial|economy|economic|trade|tariff|tariffs|sanction|sanctions|export|exports|import|imports|supply chain|inflation|interest rate|central bank|currency|debt|bond|bonds|oil|gas|energy|pipeline|semiconductor|chip|rare earth|market|markets|investment|foreign investment|multinational|corporation|corporate|merger|acquisition|antitrust|regulation|policy|lawmakers|election|treaty|border|migration|defense|defence|military|naval|arms|missile|drone|airstrike|war|conflict|NATO|BRICS|European Union|EU|United Nations|UN|WTO|IMF|World Bank|G7|G20|OPEC|ASEAN|cyberattack|ransomware|data breach|shipping|maritime|port|strait|tanker|cargo)\b/i;
  const majorNatureWords = /\b(earthquake|hurricane|typhoon|cyclone|flood|wildfire|volcano|tsunami|landslide|state of emergency|evacuation|catastrophe|disaster|fatalities|killed|dead|damage|blackout)\b/i;

  function isRelevantNewsTitle(title) {
    const text = String(title || '');
    return !sportsNewsWords.test(text) && (strategicNewsWords.test(text) || majorNatureWords.test(text));
  }

  function normalizeArticleUrl(url, host = 'https://en.wikipedia.org') {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('//')) return `https:${value}`;
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        if (parsed.hostname === window.location.hostname && parsed.pathname.startsWith('/wiki/')) {
          return `${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        return value;
      }
      return value;
    }
    if (value.startsWith('/wiki/')) return `${host}${value}`;
    return value;
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

  const portProfiles = [
    { match: /shanghai/i, traffic: 'very high traffic', shipsPerDay: '>35 ship calls/day', basis: '2024 top global container port; ~51.5M TEU/year reported' },
    { match: /singapore/i, traffic: 'very high traffic', shipsPerDay: '>30 ship calls/day', basis: '2024 top global container port; ~41M TEU/year reported' },
    { match: /ningbo|zhoushan/i, traffic: 'very high traffic', shipsPerDay: '>30 ship calls/day', basis: '2024 top global container port; ~39M TEU/year reported' },
    { match: /shenzhen/i, traffic: 'very high traffic', shipsPerDay: '>25 ship calls/day', basis: '2024 top global container port; ~33M TEU/year reported' },
    { match: /qingdao/i, traffic: 'very high traffic', shipsPerDay: '>25 ship calls/day', basis: '2024 top global container port; ~31M TEU/year reported' },
    { match: /guangzhou|nansha/i, traffic: 'very high traffic', shipsPerDay: '>20 ship calls/day', basis: '2024 top global container port; ~26M TEU/year reported' },
    { match: /busan/i, traffic: 'very high traffic', shipsPerDay: '>20 ship calls/day', basis: '2024 top global container port; ~24M TEU/year reported' },
    { match: /tianjin/i, traffic: 'very high traffic', shipsPerDay: '>20 ship calls/day', basis: '2024 top global container port; ~23M TEU/year reported' },
    { match: /jebel ali|dubai/i, traffic: 'very high traffic', shipsPerDay: '>12 ship calls/day', basis: '2024 top global container port; ~15.5M TEU/year reported' },
    { match: /port klang|klang/i, traffic: 'very high traffic', shipsPerDay: '>10 ship calls/day', basis: '2024 top global container port; ~14.6M TEU/year reported' },
    { match: /rotterdam/i, traffic: 'very high traffic', shipsPerDay: '>12 ship calls/day', basis: 'major European gateway; 2024 annual throughput 435.8M tonnes reported by port authority' },
    { match: /los angeles|long beach|new york|new jersey|antwerp|hamburg|savannah|houston|santos|felixstowe/i, traffic: 'high traffic', shipsPerDay: '8-20 ship calls/day', basis: 'major regional gateway estimate' },
    { match: /panama|suez|gibraltar|malacca|colombo|piraeus|valencia|algeciras|durban|tanger/i, traffic: 'high traffic', shipsPerDay: '6-18 ship calls/day', basis: 'major chokepoint or transshipment estimate' },
  ];

  function enrichPort(port, index = 0) {
    const label = `${port.name || ''} ${port.city || ''} ${port.country || ''}`;
    const profile = portProfiles.find(item => item.match.test(label));
    return {
      ...port,
      status: port.status || 'Open / no public closure flag',
      traffic: port.traffic || profile?.traffic || (index < 120 ? 'moderate traffic' : 'low traffic'),
      shipsPerDay: port.shipsPerDay || profile?.shipsPerDay || (index < 120 ? '2-8 ship calls/day' : '<2 ship calls/day'),
      trafficBasis: port.trafficBasis || profile?.basis || 'estimated from global shipping lane density and port dataset rank',
    };
  }

  function vesselTypeForLane(type, index) {
    if (/major/i.test(type)) return index % 3 === 0 ? 'oil' : 'container';
    if (/middle/i.test(type)) return index % 4 === 0 ? 'lng' : 'container';
    return 'container';
  }

  function syntheticVesselName(type, laneIndex, vesselIndex) {
    const label = String(type || 'vessel');
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} vessel ${laneIndex}-${vesselIndex}`;
  }

  function makeVesselsFromLanes(lanes) {
    const vessels = [];
    (lanes || []).slice(0, 90).forEach((lane, laneIndex) => {
      const count = /major/i.test(lane.type) ? 3 : /middle/i.test(lane.type) ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const type = vesselTypeForLane(lane.type, i);
        vessels.push({
          id: `EST-${laneIndex}-${i}`,
          name: syntheticVesselName(type, laneIndex, i),
          type,
          lane: laneIndex,
          progress: ((laneIndex * 0.137) + (i / count)) % 1,
          speed: /major/i.test(lane.type) ? 0.00045 : 0.00028,
          dir: (laneIndex + i) % 2 === 0 ? 1 : -1,
          status: 'Underway',
          source: 'Synthetic estimate from public Shipping-Lanes route data',
        });
      }
    });
    return vessels;
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
    const currentEvents = await loadWikipediaCurrentEvents();
    const url = 'https://en.wikinews.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Published&cmtype=page&cmprop=ids|title|timestamp&cmsort=timestamp&cmdir=desc&cmlimit=40&format=json&origin=*';
    const data = await getJson(url).catch(() => ({ query: { categorymembers: [] } }));
    const wikinews = (data.query && data.query.categorymembers || []).map(item => {
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

    const byId = new Map();
    [...currentEvents, ...wikinews].filter(item => isRelevantNewsTitle(item.title)).forEach(item => {
      const key = item.url || item.id || item.title;
      if (!byId.has(key)) byId.set(key, item);
    });
    return [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 180);
  }

  function currentEventPages() {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const pages = [];
    const now = new Date();
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(now.getTime() - offset * 86400000);
      pages.push({
        page: `Portal:Current_events/${day.getUTCFullYear()}_${months[day.getUTCMonth()]}_${day.getUTCDate()}`,
        ts: Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12),
      });
    }
    return pages;
  }

  async function loadWikipediaCurrentEvents() {
    const pages = await Promise.all(currentEventPages().map(async item => {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(item.page)}&prop=text&format=json&origin=*`;
      try {
        const data = await getJson(url);
        return { ...item, html: data.parse && data.parse.text && data.parse.text['*'] || '' };
      } catch {
        return { ...item, html: '' };
      }
    }));

    const output = [];
    pages.forEach(page => {
      if (!page.html) return;
      const doc = new DOMParser().parseFromString(page.html, 'text/html');
      const bullets = [...doc.querySelectorAll('li')]
        .map(node => compactText(node.textContent))
        .filter(text => text.length > 55 && text.length < 260)
        .filter(isRelevantNewsTitle)
        .slice(0, 35);

      bullets.forEach((title, index) => {
        const link = [...doc.querySelectorAll('a')]
          .find(anchor => title.includes(compactText(anchor.textContent)) && anchor.href);
        const located = newsLocation(title);
        output.push({
          id: `wiki-current-${page.page}-${index}`,
          lat: located.lat,
          lon: located.lon,
          city: located.city,
          country: located.country,
          title,
          category: 'NEWS',
          source: 'wikipedia.org',
          sourceName: 'Wikipedia Current Events',
          officialSource: true,
          url: link ? normalizeArticleUrl(link.getAttribute('href') || link.href) : `https://en.wikipedia.org/wiki/${encodeURIComponent(page.page.replace(/ /g, '_'))}`,
          sources: 1,
          ts: page.ts - index * 60000,
        });
      });
    });

    return output;
  }

  function mapPocketWorldFlight(plane) {
    const lastSeen = Number(plane.last_seen ?? plane.last_contact);
    return {
      id: plane.icao24 || plane.hex || plane.callsign || plane.registration,
      callsign: String(plane.callsign || plane.flight || plane.icao24 || '').trim(),
      country: plane.country || plane.operator || plane.airline || 'PocketWorld',
      lon: Number(plane.lng ?? plane.lon),
      lat: Number(plane.lat),
      alt: Number(plane.alt ?? plane.baro_alt ?? plane.geo_alt),
      velocity: Number(plane.velocity ?? plane.gs),
      heading: Number(plane.heading ?? plane.track),
      verticalRate: Number(plane.vertical_rate ?? plane.geom_rate),
      updated: Number.isFinite(lastSeen) ? Date.now() - lastSeen * 1000 : Date.now(),
      source: plane.source ? `PocketWorld / ${plane.source}` : 'PocketWorld',
      sourceName: 'PocketWorld flights',
      sourceQuality: plane.source_quality,
      sourceType: plane.source_type,
      registration: plane.registration,
      manufacturer: plane.manufacturer,
      model: plane.model,
      typecode: plane.typecode,
      operator: plane.operator,
      aircraftType: plane.aircraft_type,
      origin: plane.origin,
      destination: plane.destination,
      airline: plane.airline,
      live: true,
    };
  }

  function mapMilitaryFlight(plane) {
    const seen = Number(plane.seen);
    return {
      id: `MIL-AIR-${plane.hex || plane.flight || plane.r || Math.random().toString(36).slice(2)}`,
      callsign: String(plane.flight || plane.callsign || plane.r || plane.hex || '').trim(),
      country: plane.country || plane.t || 'Military ADS-B',
      lon: Number(plane.lon),
      lat: Number(plane.lat),
      alt: Number(plane.alt_baro === 'ground' ? 0 : plane.alt_baro ?? plane.alt_geom),
      velocity: Number(plane.gs),
      heading: Number(plane.track ?? plane.true_heading ?? plane.mag_heading),
      updated: Number.isFinite(seen) ? Date.now() - seen * 1000 : Date.now(),
      registration: plane.r,
      typecode: plane.t,
      model: plane.desc,
      operator: plane.ownOp || plane.operator,
      function: 'Military Flight',
      source: 'ADSB.lol military',
      sourceName: 'ADSB.lol military',
      live: true,
    };
  }

  async function loadFlights(limit = 2500) {
    const data = await getJson(POCKETWORLD_FLIGHTS_URL);
    const aircraft = data.flights || data.ac || data.aircraft || [];
    return aircraft
      .map(mapPocketWorldFlight)
      .filter(plane => Number.isFinite(plane.lat) && Number.isFinite(plane.lon))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .slice(0, limit);
  }

  async function loadMilitaryFlights(limit = 1000) {
    const data = await getJson(ADSB_LOL_MILITARY_URL);
    const aircraft = data.ac || data.aircraft || [];
    return aircraft
      .map(mapMilitaryFlight)
      .filter(plane => Number.isFinite(plane.lat) && Number.isFinite(plane.lon))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .slice(0, limit);
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
      .map(enrichPort)
      .slice(0, 1200);
  }

  function decodeBase64Uint32LE(value) {
    const binary = atob(String(value || ''));
    const output = [];
    for (let offset = 0; offset + 3 < binary.length; offset += 4) {
      output.push(
        binary.charCodeAt(offset)
        | (binary.charCodeAt(offset + 1) << 8)
        | (binary.charCodeAt(offset + 2) << 16)
        | (binary.charCodeAt(offset + 3) << 24)
      );
    }
    return output;
  }

  function jitter(value, seed, amount = 0.8) {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return value + (x - Math.floor(x) - 0.5) * amount;
  }

  async function loadKasperskyCyber(limit = 500) {
    const hour = new Date().getUTCHours();
    const hours = [hour, (hour + 23) % 24];
    const countriesPromise = getJson(KASPERSKY_COUNTRIES_URL, { cache: 'no-store' });
    let eventData = null;

    for (const eventHour of hours) {
      try {
        const cacheBust = `gd=${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const candidate = await getJson(`${KASPERSKY_EVENTS_BASE}/${eventHour}.json?${cacheBust}`, { cache: 'no-store' });
        if (candidate && candidate.events) {
          eventData = { ...candidate, hour: eventHour };
          break;
        }
      } catch {
        // Try the previous hour if the current Kaspersky packet is not available yet.
      }
    }
    if (!eventData) throw new Error('Kaspersky event packet unavailable');

    const countries = await countriesPromise;
    const countryByKey = Object.fromEntries((countries || []).map(country => [
      country.key,
      String(country.name || '').replace('MAP_COUNTRY_', ''),
    ]));
    const events = decodeBase64Uint32LE(eventData.events);
    const traces = [];

    for (let index = 0; index + 1 < events.length; index += 2) {
      const packed = events[index];
      const count = events[index + 1];
      const typeId = (packed >>> 24) & 255;
      const targetKey = (packed >>> 12) & 4095;
      const sourceKey = packed & 4095;
      const type = KASPERSKY_TYPES[typeId];
      const targetIso = countryByKey[targetKey];
      const sourceIso = countryByKey[sourceKey];
      const targetCenter = COUNTRY_CENTROIDS[targetIso];
      if (!type || !targetCenter || !count) continue;

      const sourceCenter = COUNTRY_CENTROIDS[sourceIso] || KASPERSKY_HUBS[typeId % KASPERSKY_HUBS.length];
      const seed = targetKey * 13 + typeId * 29 + count;
      traces.push({
        id: `kas-static-${eventData.hour}-${type.code}-${targetKey}-${sourceKey}`,
        kind: 'kaspersky',
        sourceName: 'Kaspersky Cybermap',
        type: type.code,
        severity: count > 900 ? 'CRIT' : count > 260 ? 'HIGH' : count > 70 ? 'MED' : 'LOW',
        title: `${type.label}: ${targetCenter.label}`,
        count,
        color: type.color,
        origin: {
          lat: jitter(sourceCenter.lat, seed + 1, 1.4),
          lon: jitter(sourceCenter.lon, seed + 2, 1.4),
          label: sourceCenter.label || sourceIso || 'Kaspersky aggregate',
          country: sourceIso || 'GLOBAL',
        },
        target: {
          lat: jitter(targetCenter.lat, seed + 3, 1.0),
          lon: jitter(targetCenter.lon, seed + 4, 1.0),
          label: targetCenter.label,
          country: targetIso,
        },
        ts: Date.now(),
      });
    }

    return traces
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(40, Math.min(Number(limit) || 500, 1200)));
  }

  async function settle(name, loader) {
    try {
      const data = await loader();
      return { name, ok: true, data };
    } catch (error) {
      return { name, ok: false, data: [], error: error.message };
    }
  }

  async function staticPayload(requestUrl) {
    const flightLimit = parseLimitFromUrl(requestUrl, 'limit', 2500, 5000);
    const objectLimit = parseLimitFromUrl(requestUrl, 'objects', 1200, 5000);
    const results = await Promise.all([
      settle('news', loadNews),
      settle('flights', () => loadFlights(flightLimit)),
      settle('militaryFlights', () => loadMilitaryFlights(Math.min(objectLimit, 1000))),
      settle('earthquakes', loadEarthquakes),
      settle('weather', loadWeather),
      settle('shippingLanes', loadShippingLanes),
      settle('ports', loadPorts),
      settle('kasperskyCyber', () => loadKasperskyCyber(objectLimit)),
    ]);
    const byName = Object.fromEntries(results.map(result => [result.name, result]));
    const shippingLanes = byName.shippingLanes.data;
    const vessels = makeVesselsFromLanes(shippingLanes);
    return {
      generatedAt: Date.now(),
      sources: [
        ...results.map(result => sourceResult(result.name, result.ok, result.data, result.error)),
        sourceResult('vessels', true, vessels, 'Estimated positions from public shipping lanes'),
      ],
      flights: byName.flights.data,
      militaryFlights: byName.militaryFlights.data,
      news: byName.news.data,
      shippingLanes,
      ports: byName.ports.data,
      vessels,
      militaryBases: [],
      militaryShips: [],
      conflictEvents: [],
      aisstream: [],
      earthquakes: byName.earthquakes.data,
      weather: byName.weather.data,
      kasperskyCyber: byName.kasperskyCyber.data,
      cached: false,
      staticPageFallback: true,
    };
  }

  let payloadPromise = null;
  window.fetch = function (input, options) {
    const url = typeof input === 'string' ? input : input && input.url;
    if (/^http:\/\/localhost:30(00|01|09)\/api\/live/.test(String(url || ''))) {
      payloadPromise = payloadPromise || staticPayload(String(url || ''));
      return payloadPromise.then(jsonResponse);
    }
    return originalFetch(input, options);
  };
})();
