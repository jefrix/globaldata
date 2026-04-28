const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const CACHE_TTL_MS = Number(process.env.LIVE_CACHE_TTL_MS || 30000);
const SHIPPING_LANES_URL = 'https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/main/data/Shipping_Lanes_v1.geojson';
const PORTS_URL = 'https://raw.githubusercontent.com/tayljordan/ports/main/ports.json';
const ADSB_LOL_URL = 'https://api.adsb.lol/v2/lat/0/lon/0/dist/10000';
const KASPERSKY_COUNTRIES_URL = 'https://cybermap.kaspersky.com/map/data/countries.json';
const KASPERSKY_EVENTS_BASE = 'https://sm-cybermap-mediaprod.smweb.tech/data/events/default';
const MAX_FLIGHTS = Number(process.env.MAX_LIVE_FLIGHTS || 5000);
let cache = null;

const OFFICIAL_RSS_FEEDS = [
  { source: 'BBC World', domain: 'bbc.com', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', country: 'GBR' },
  { source: 'Al Jazeera', domain: 'aljazeera.com', url: 'https://www.aljazeera.com/xml/rss/all.xml', country: 'QAT' },
  { source: 'The Guardian World', domain: 'theguardian.com', url: 'https://www.theguardian.com/world/rss', country: 'GBR' },
  { source: 'NPR World', domain: 'npr.org', url: 'https://feeds.npr.org/1004/rss.xml', country: 'USA' },
  { source: 'France 24', domain: 'france24.com', url: 'https://www.france24.com/en/rss', country: 'FRA' },
  { source: 'DW World', domain: 'dw.com', url: 'https://rss.dw.com/xml/rss-en-world', country: 'DEU' },
  { source: 'ABC News International', domain: 'abcnews.go.com', url: 'https://abcnews.go.com/abcnews/internationalheadlines', country: 'USA' },
];

const OFFICIAL_NEWS_DOMAINS = [
  'abc.net.au',
  'abcnews.go.com',
  'aljazeera.com',
  'apnews.com',
  'bbc.co.uk',
  'bbc.com',
  'bloomberg.com',
  'cbc.ca',
  'cbsnews.com',
  'cnbc.com',
  'cnn.com',
  'dw.com',
  'euronews.com',
  'france24.com',
  'ft.com',
  'nbcnews.com',
  'news.sky.com',
  'npr.org',
  'politico.com',
  'reuters.com',
  'scmp.com',
  'straitstimes.com',
  'theguardian.com',
  'thehindu.com',
  'timesofindia.indiatimes.com',
  'usatoday.com',
  'washingtonpost.com',
  'wsj.com',
];

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

const MILITARY_BASES = [
  { id: 'MIL-RAMSTEIN', name: 'Ramstein Air Base', country: 'Germany', function: 'Air Base', region: 'Europe', lat: 49.44, lon: 7.60 },
  { id: 'MIL-ROTA', name: 'Naval Station Rota', country: 'Spain', function: 'Naval Base', region: 'Europe', lat: 36.62, lon: -6.35 },
  { id: 'MIL-NORFOLK', name: 'Naval Station Norfolk', country: 'United States', function: 'Naval Base', region: 'North America', lat: 36.95, lon: -76.33 },
  { id: 'MIL-SAN-DIEGO', name: 'Naval Base San Diego', country: 'United States', function: 'Naval Base', region: 'North America', lat: 32.68, lon: -117.12 },
  { id: 'MIL-PEARL', name: 'Joint Base Pearl Harbor-Hickam', country: 'United States', function: 'Joint Naval/Air Base', region: 'Pacific', lat: 21.35, lon: -157.95 },
  { id: 'MIL-YOKOSUKA', name: 'Fleet Activities Yokosuka', country: 'Japan', function: 'Naval Base', region: 'Pacific', lat: 35.29, lon: 139.67 },
  { id: 'MIL-OSAN', name: 'Osan Air Base', country: 'South Korea', function: 'Air Base', region: 'Pacific', lat: 37.09, lon: 127.03 },
  { id: 'MIL-GUAM', name: 'Naval Base Guam', country: 'United States', function: 'Naval Base', region: 'Pacific', lat: 13.44, lon: 144.66 },
  { id: 'MIL-DIEGO-GARCIA', name: 'Diego Garcia', country: 'United Kingdom', function: 'Joint Support Facility', region: 'Indian Ocean', lat: -7.31, lon: 72.41 },
  { id: 'MIL-BAHRAIN', name: 'Naval Support Activity Bahrain', country: 'Bahrain', function: 'Naval Base', region: 'Middle East', lat: 26.20, lon: 50.61 },
  { id: 'MIL-INCIRLIK', name: 'Incirlik Air Base', country: 'Turkey', function: 'Air Base', region: 'Middle East', lat: 37.00, lon: 35.43 },
  { id: 'MIL-DJIBOUTI', name: 'Camp Lemonnier', country: 'Djibouti', function: 'Expeditionary Base', region: 'Horn of Africa', lat: 11.55, lon: 43.15 },
  { id: 'MIL-AKROTIRI', name: 'RAF Akrotiri', country: 'United Kingdom', function: 'Air Base', region: 'Eastern Mediterranean', lat: 34.59, lon: 32.99 },
  { id: 'MIL-DARWIN', name: 'Robertson Barracks', country: 'Australia', function: 'Army Base', region: 'Pacific', lat: -12.44, lon: 130.97 },
];

const MILITARY_SHIPS = [
  { id: 'NAV-ATL-01', name: 'Atlantic Surface Group', country: 'United States', function: 'Naval Ship', region: 'North Atlantic', lat: 36.2, lon: -45.0, type: 'military' },
  { id: 'NAV-MED-01', name: 'Mediterranean Task Group', country: 'NATO', function: 'Naval Ship', region: 'Mediterranean', lat: 34.7, lon: 18.4, type: 'military' },
  { id: 'NAV-GULF-01', name: 'Gulf Patrol Group', country: 'United States', function: 'Naval Ship', region: 'Persian Gulf', lat: 25.9, lon: 54.5, type: 'military' },
  { id: 'NAV-IO-01', name: 'Indian Ocean Surface Group', country: 'United Kingdom', function: 'Naval Ship', region: 'Indian Ocean', lat: -4.5, lon: 68.0, type: 'military' },
  { id: 'NAV-SCS-01', name: 'South China Sea Patrol', country: 'United States', function: 'Naval Ship', region: 'South China Sea', lat: 12.2, lon: 114.5, type: 'military' },
  { id: 'NAV-PAC-01', name: 'Western Pacific Carrier Group', country: 'United States', function: 'Naval Ship', region: 'Western Pacific', lat: 24.5, lon: 138.0, type: 'military' },
  { id: 'NAV-BALTIC-01', name: 'Baltic Maritime Patrol', country: 'NATO', function: 'Naval Ship', region: 'Baltic Sea', lat: 56.1, lon: 19.3, type: 'military' },
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    timeout: 12000,
    headers: {
      accept: 'application/geo+json, application/json',
      'user-agent': 'globaldata-local-prototype/1.0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }

  return response.json();
}

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function sampleEvenly(items, maxItems) {
  if (!Array.isArray(items) || items.length <= maxItems) return items;
  const step = items.length / maxItems;
  return Array.from({ length: maxItems }, (_, index) => items[Math.floor(index * step)]);
}

function parseLimit(value, fallback, max) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(limit)));
}

function decodeBase64Uint32LE(value) {
  const buffer = Buffer.from(value || '', 'base64');
  const output = [];
  for (let offset = 0; offset + 3 < buffer.length; offset += 4) {
    output.push(buffer.readUInt32LE(offset));
  }
  return output;
}

function jitter(value, seed, amount = 0.8) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return value + (x - Math.floor(x) - 0.5) * amount;
}

function currentUtcDayStart() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function yesterdayUtcDayStart() {
  return currentUtcDayStart() - 86400000;
}

function normalizeDomain(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

function isOfficialNewsDomain(value) {
  const domain = normalizeDomain(value);
  return OFFICIAL_NEWS_DOMAINS.some(official => domain === official || domain.endsWith(`.${official}`));
}

function stripXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function xmlTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripXml(match[1]) : '';
}

function locationFromText(text, fallbackCode) {
  const haystack = String(text || '').toLowerCase();
  const matches = Object.entries(COUNTRY_CENTROIDS)
    .filter(([code, center]) => code.length === 3 && center?.label && haystack.includes(center.label.toLowerCase()));
  if (matches.length) return { code: matches[0][0], center: matches[0][1] };
  const fallback = COUNTRY_CENTROIDS[fallbackCode] || COUNTRY_CENTROIDS.USA;
  return { code: fallbackCode || 'USA', center: fallback };
}

async function getRssNews() {
  const since = yesterdayUtcDayStart();
  const settled = await Promise.all(OFFICIAL_RSS_FEEDS.map(async feed => {
    try {
      const response = await fetch(feed.url, {
        timeout: 12000,
        headers: {
          accept: 'application/rss+xml, application/xml, text/xml',
          'user-agent': 'globaldata-local-prototype/1.0',
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const xml = await response.text();
      const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
      return blocks.map((block, index) => {
        const title = xmlTag(block, 'title');
        const description = xmlTag(block, 'description') || xmlTag(block, 'summary');
        const link = xmlTag(block, 'link') || (block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '');
        const pubDate = xmlTag(block, 'pubDate') || xmlTag(block, 'updated') || xmlTag(block, 'published');
        const ts = pubDate ? Date.parse(pubDate) : Date.now();
        const located = locationFromText(`${title} ${description}`, feed.country);
        return {
          id: link || `${feed.domain}-${index}-${title}`,
          lat: located.center.lat,
          lon: located.center.lon,
          city: located.center.label,
          country: located.code,
          title,
          category: 'NEWS',
          source: feed.domain,
          sourceName: feed.source,
          officialSource: true,
          url: link,
          sources: 1,
          ts,
        };
      }).filter(item => item.title && item.ts >= since);
    } catch (error) {
      return [];
    }
  }));

  return settled.flat();
}

function normalizeLineCoordinates(geometry) {
  const lines = [];
  if (!geometry) return lines;

  if (geometry.type === 'LineString') {
    lines.push(geometry.coordinates);
  } else if (geometry.type === 'MultiLineString') {
    geometry.coordinates.forEach(line => lines.push(line));
  }

  return lines
    .map(line => line
      .map(([lon, lat]) => [finiteNumber(lat), finiteNumber(lon)])
      .filter(([lat, lon]) => lat !== null && lon !== null))
    .filter(line => line.length > 1);
}

function centroidFromGeometry(geometry) {
  if (!geometry || !geometry.coordinates) return null;

  const points = [];
  const walk = coords => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      points.push({ lon: coords[0], lat: coords[1] });
      return;
    }
    coords.forEach(walk);
  };

  walk(geometry.coordinates);
  if (!points.length) return null;

  const sums = points.reduce((acc, p) => ({
    lat: acc.lat + p.lat,
    lon: acc.lon + p.lon,
  }), { lat: 0, lon: 0 });

  return {
    lat: sums.lat / points.length,
    lon: sums.lon / points.length,
  };
}

async function getFlights(limit = MAX_FLIGHTS) {
  try {
    const data = await fetchJson(ADSB_LOL_URL);
    const aircraft = data.ac || data.aircraft || [];
    const flights = aircraft
      .map(a => ({
        id: a.hex || a.icao || a.flight || a.r,
        callsign: (a.flight || a.callsign || a.r || a.hex || '').trim(),
        country: a.dbFlags ? 'ADSB.lol' : a.t || 'ADSB.lol',
        lon: finiteNumber(a.lon),
        lat: finiteNumber(a.lat),
        alt: finiteNumber(a.alt_baro === 'ground' ? 0 : a.alt_baro || a.alt_geom),
        velocity: finiteNumber(a.gs),
        heading: finiteNumber(a.track || a.true_heading || a.mag_heading),
        updated: Date.now() - Number(a.seen || 0) * 1000,
        source: 'ADSB.lol',
      }))
      .filter(f => f.lat !== null && f.lon !== null);
    if (flights.length) {
      const sampledFlights = sampleEvenly(flights, limit);
      sampledFlights.sort((a, b) => (b.updated || 0) - (a.updated || 0));
      return sampledFlights;
    }
  } catch (error) {
    // OpenSky remains the secondary source because anonymous ADS-B feeds can be rate limited.
  }

  const data = await fetchJson('https://opensky-network.org/api/states/all');
  const flights = (data.states || [])
    .map(row => ({
      id: row[0],
      callsign: (row[1] || '').trim() || row[0],
      country: row[2],
      lon: finiteNumber(row[5]),
      lat: finiteNumber(row[6]),
      alt: finiteNumber(row[7]),
      velocity: finiteNumber(row[9]),
      heading: finiteNumber(row[10]),
      updated: row[4] ? row[4] * 1000 : Date.now(),
      source: 'OpenSky',
    }))
    .filter(f => f.lat !== null && f.lon !== null);
  return sampleEvenly(flights, limit);
}

async function getShippingLanes() {
  const data = await fetchJson(SHIPPING_LANES_URL);
  const lanes = [];

  (data.features || []).forEach((feature, index) => {
    const type = feature.properties?.Type || feature.properties?.type || 'Route';
    normalizeLineCoordinates(feature.geometry).forEach((points, part) => {
      lanes.push({
        id: `shipping-${index}-${part}`,
        type,
        pts: points,
      });
    });
  });

  return lanes.slice(0, 260);
}

async function getPorts() {
  const data = await fetchJson(PORTS_URL);
  return (Array.isArray(data) ? data : [])
    .map((p, index) => ({
      id: `port-${index}`,
      name: p.CITY || p.city || 'Port',
      state: p.STATE || p.state,
      country: p.COUNTRY || p.country,
      lat: finiteNumber(p.LATITUDE ?? p.latitude),
      lon: finiteNumber(p.LONGITUDE ?? p.longitude),
      source: 'tayljordan/ports',
    }))
    .filter(p => p.lat !== null && p.lon !== null)
    .slice(0, 1200);
}

function vesselTypeForLane(type, index) {
  if (/major/i.test(type)) return index % 3 === 0 ? 'oil' : 'container';
  if (/middle/i.test(type)) return index % 4 === 0 ? 'lng' : 'container';
  return 'container';
}

function makeVesselsFromLanes(lanes) {
  const vessels = [];
  lanes.slice(0, 90).forEach((lane, laneIndex) => {
    const count = /major/i.test(lane.type) ? 3 : /middle/i.test(lane.type) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      vessels.push({
        id: `AIS-${laneIndex}-${i}`,
        type: vesselTypeForLane(lane.type, i),
        lane: laneIndex,
        progress: ((laneIndex * 0.137) + (i / count)) % 1,
        speed: /major/i.test(lane.type) ? 0.00045 : 0.00028,
        dir: (laneIndex + i) % 2 === 0 ? 1 : -1,
        source: 'Shipping-Lanes synthetic traffic',
      });
    }
  });
  return vessels;
}

async function getUcdpConflicts() {
  const token = process.env.UCDP_TOKEN;
  if (!token) {
    throw new Error('Set UCDP_TOKEN to enable UCDP GED conflict events');
  }

  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 90);
  const fmt = d => d.toISOString().slice(0, 10);
  const url = `https://ucdpapi.pcr.uu.se/api/gedevents/25.1?pagesize=100&StartDate=${fmt(start)}&EndDate=${fmt(end)}`;
  const data = await fetchJson(url, { headers: { 'x-ucdp-access-token': token } });
  return (data.Result || [])
    .map(event => ({
      id: event.id,
      lat: finiteNumber(event.latitude),
      lon: finiteNumber(event.longitude),
      country: event.country,
      title: event.conflict_name || event.dyad_name || 'UCDP conflict event',
      note: event.event_clarity || event.type_of_violence || event.dyad_name,
      level: Math.min(1, Math.max(0.2, Number(event.best || 1) / 25)),
      fatalities: Number(event.best || 0),
      ts: event.date_end ? Date.parse(event.date_end) : Date.now(),
      source: 'UCDP GED',
    }))
    .filter(e => e.lat !== null && e.lon !== null);
}

async function getAisStreamStatus() {
  const configured = Boolean(process.env.AISSTREAM_API_KEY);
  if (!configured) {
    throw new Error('Set AISSTREAM_API_KEY to enable live AISStream WebSocket ingestion');
  }
  return [{
    id: 'aisstream-configured',
    configured: true,
    boundingBoxes: 'backend WebSocket integration pending',
  }];
}

async function getEarthquakes() {
  const data = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
  return (data.features || []).map(feature => {
    const [lon, lat, depth] = feature.geometry?.coordinates || [];
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
  }).filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon));
}

async function getWeatherAlerts() {
  const data = await fetchJson('https://api.weather.gov/alerts/active?status=actual');
  return (data.features || []).map(feature => {
    const props = feature.properties || {};
    const center = centroidFromGeometry(feature.geometry);
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

async function getNews() {
  const query = encodeURIComponent('(conflict OR earthquake OR storm OR election OR cyberattack OR port OR energy OR supply chain)');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&timespan=24h&maxrecords=250&sort=hybridrel`;
  const dayStart = yesterdayUtcDayStart();

  let gdeltArticles = [];
  try {
    const data = await fetchJson(url);
    gdeltArticles = data.articles || [];
  } catch (error) {
    gdeltArticles = [];
  }

  const gdeltNews = gdeltArticles.filter(article => {
    const domain = article.domain || article.source || article.url;
    const seenAt = article.seendate ? Date.parse(article.seendate) : 0;
    return seenAt >= dayStart && isOfficialNewsDomain(domain);
  }).map((article, index) => {
    const code = article.sourceCountry || article.sourcecountry || 'US';
    const center = COUNTRY_CENTROIDS[code] || COUNTRY_CENTROIDS.US;
    const source = normalizeDomain(article.domain || article.source || article.url);
    return {
      id: article.url || `gdelt-${index}`,
      lat: center.lat,
      lon: center.lon,
      city: center.label,
      country: code,
      title: article.title || 'Global news report',
      category: 'NEWS',
      source,
      officialSource: true,
      language: article.language,
      url: article.url,
      sources: 1,
      ts: article.seendate ? Date.parse(article.seendate) : Date.now(),
    };
  }).filter(n => n.title);

  const rssNews = await getRssNews();
  const byId = new Map();
  [...gdeltNews, ...rssNews].forEach(item => {
    const key = item.url || item.id || item.title;
    if (!byId.has(key)) byId.set(key, item);
  });

  return [...byId.values()]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 120);
}

async function getKasperskyCyberTraces(limit = 500) {
  const hour = new Date().getUTCHours();
  const [eventData, countries] = await Promise.all([
    fetchJson(`${KASPERSKY_EVENTS_BASE}/${hour}.json`),
    fetchJson(KASPERSKY_COUNTRIES_URL),
  ]);

  const countryByKey = Object.fromEntries((countries || []).map(country => [
    country.key,
    String(country.name || '').replace('MAP_COUNTRY_', ''),
  ]));

  const events = decodeBase64Uint32LE(eventData.events);
  const traces = [];

  for (let index = 0; index + 1 < events.length; index += 2) {
    const packed = events[index];
    const count = events[index + 1];
    const typeId = (packed >> 24) & 255;
    const targetKey = (packed >> 12) & 4095;
    const sourceKey = packed & 4095;
    const type = KASPERSKY_TYPES[typeId];
    const targetIso = countryByKey[targetKey];
    const sourceIso = countryByKey[sourceKey];
    const targetCenter = COUNTRY_CENTROIDS[targetIso];
    if (!type || !targetCenter || !count) continue;

    const sourceCenter = COUNTRY_CENTROIDS[sourceIso] || KASPERSKY_HUBS[typeId % KASPERSKY_HUBS.length];
    const seed = targetKey * 13 + typeId * 29 + count;

    traces.push({
      id: `kas-${hour}-${type.code}-${targetKey}-${sourceKey}`,
      kind: 'kaspersky',
      sourceName: 'Kaspersky Cybermap',
      type: type.code,
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
    .slice(0, limit);
}

async function settle(name, loader) {
  try {
    return { name, ok: true, data: await loader() };
  } catch (error) {
    return { name, ok: false, data: [], error: error.message };
  }
}

router.get('/', async (req, res) => {
  const flightLimit = parseLimit(req.query.limit, MAX_FLIGHTS, 10000);
  const objectLimit = parseLimit(req.query.objects, 1200, 5000);
  const cacheKey = `limit=${flightLimit};objects=${objectLimit}`;

  res.set('Cache-Control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);

  if (cache && cache.key === cacheKey && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
    res.json({ ...cache.payload, cached: true });
    return;
  }

  const results = await Promise.all([
    settle('flights', () => getFlights(flightLimit)),
    settle('shippingLanes', getShippingLanes),
    settle('ports', getPorts),
    settle('military', async () => MILITARY_BASES),
    settle('ucdpConflicts', getUcdpConflicts),
    settle('aisstream', getAisStreamStatus),
    settle('earthquakes', getEarthquakes),
    settle('weather', getWeatherAlerts),
    settle('news', getNews),
    settle('kasperskyCyber', () => getKasperskyCyberTraces(objectLimit)),
  ]);

  const shippingLanes = results.find(r => r.name === 'shippingLanes').data;

  const payload = {
    generatedAt: Date.now(),
    sources: results.map(({ name, ok, error, data }) => ({
      name,
      ok,
      count: data.length,
      error,
    })),
    flights: results.find(r => r.name === 'flights').data,
    shippingLanes,
    ports: results.find(r => r.name === 'ports').data,
    militaryBases: results.find(r => r.name === 'military').data,
    militaryShips: MILITARY_SHIPS,
    conflictEvents: results.find(r => r.name === 'ucdpConflicts').data,
    aisstream: results.find(r => r.name === 'aisstream').data,
    vessels: makeVesselsFromLanes(shippingLanes),
    earthquakes: results.find(r => r.name === 'earthquakes').data,
    weather: results.find(r => r.name === 'weather').data,
    news: results.find(r => r.name === 'news').data,
    kasperskyCyber: results.find(r => r.name === 'kasperskyCyber').data,
  };

  cache = { key: cacheKey, generatedAt: Date.now(), payload };
  global.__GLOBALDATA_LIVE_CACHE_GENERATED_AT = cache.generatedAt;
  res.json({ ...payload, cached: false });
});

module.exports = router;
