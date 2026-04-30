const fs = require('fs/promises');
const path = require('path');

const OUT_FILE = path.join(__dirname, '..', 'data', 'live-cache.json');
const USER_AGENT = 'globaldata-live-cache/1.0 (+https://jefrix.github.io/globaldata/)';
const TIMEOUT_MS = 14000;
const MAX_NEWS = 1600;
const MAX_CONFLICTS = 600;

const locations = [
  ['ukraine', 49.0, 31.4, 'Ukraine', 'UKR'], ['kyiv', 50.45, 30.52, 'Kyiv', 'UKR'],
  ['kharkiv', 50.0, 36.23, 'Kharkiv', 'UKR'], ['odesa', 46.48, 30.72, 'Odesa', 'UKR'],
  ['russia', 61.5, 105.3, 'Russia', 'RUS'], ['moscow', 55.76, 37.62, 'Moscow', 'RUS'],
  ['belgorod', 50.6, 36.6, 'Belgorod', 'RUS'], ['crimea', 45.3, 34.4, 'Crimea', 'UKR'],
  ['israel', 31.0, 35.0, 'Israel', 'ISR'], ['jerusalem', 31.78, 35.22, 'Jerusalem', 'ISR'],
  ['tel aviv', 32.08, 34.78, 'Tel Aviv', 'ISR'], ['gaza', 31.5, 34.47, 'Gaza', 'PSE'],
  ['lebanon', 33.85, 35.86, 'Lebanon', 'LBN'], ['beirut', 33.89, 35.5, 'Beirut', 'LBN'],
  ['syria', 34.8, 38.9, 'Syria', 'SYR'], ['damascus', 33.51, 36.28, 'Damascus', 'SYR'],
  ['iran', 32.4, 53.7, 'Iran', 'IRN'], ['tehran', 35.69, 51.39, 'Tehran', 'IRN'],
  ['isfahan', 32.65, 51.67, 'Isfahan', 'IRN'], ['bandar abbas', 27.18, 56.27, 'Bandar Abbas', 'IRN'],
  ['iraq', 33.2, 43.7, 'Iraq', 'IRQ'], ['baghdad', 33.31, 44.36, 'Baghdad', 'IRQ'],
  ['yemen', 15.55, 48.52, 'Yemen', 'YEM'], ['sanaa', 15.35, 44.2, 'Sanaa', 'YEM'],
  ['red sea', 20.0, 38.5, 'Red Sea', 'MARITIME'], ['hormuz', 26.57, 56.25, 'Strait of Hormuz', 'MARITIME'],
  ['taiwan', 23.7, 121.0, 'Taiwan', 'TWN'], ['taipei', 25.03, 121.56, 'Taipei', 'TWN'],
  ['china', 35.9, 104.2, 'China', 'CHN'], ['beijing', 39.9, 116.4, 'Beijing', 'CHN'],
  ['south china sea', 12.0, 113.0, 'South China Sea', 'MARITIME'],
  ['north korea', 40.34, 127.51, 'North Korea', 'PRK'], ['pyongyang', 39.04, 125.76, 'Pyongyang', 'PRK'],
  ['south korea', 36.5, 127.8, 'South Korea', 'KOR'], ['seoul', 37.57, 126.98, 'Seoul', 'KOR'],
  ['japan', 36.2, 138.3, 'Japan', 'JPN'], ['tokyo', 35.68, 139.76, 'Tokyo', 'JPN'],
  ['india', 20.6, 78.9, 'India', 'IND'], ['new delhi', 28.61, 77.21, 'New Delhi', 'IND'],
  ['pakistan', 30.38, 69.35, 'Pakistan', 'PAK'], ['islamabad', 33.68, 73.05, 'Islamabad', 'PAK'],
  ['afghanistan', 33.94, 67.71, 'Afghanistan', 'AFG'], ['kabul', 34.56, 69.18, 'Kabul', 'AFG'],
  ['sudan', 12.86, 30.22, 'Sudan', 'SDN'], ['khartoum', 15.5, 32.56, 'Khartoum', 'SDN'],
  ['mali', 17.57, -3.99, 'Mali', 'MLI'], ['bamako', 12.64, -8.0, 'Bamako', 'MLI'],
  ['niger', 17.61, 8.08, 'Niger', 'NER'], ['niamey', 13.51, 2.13, 'Niamey', 'NER'],
  ['somalia', 5.15, 46.2, 'Somalia', 'SOM'], ['mogadishu', 2.05, 45.32, 'Mogadishu', 'SOM'],
  ['ethiopia', 9.15, 40.49, 'Ethiopia', 'ETH'], ['addis ababa', 8.98, 38.76, 'Addis Ababa', 'ETH'],
  ['united states', 39.8, -98.6, 'United States', 'USA'], ['washington', 38.9, -77.04, 'Washington', 'USA'],
  ['mexico', 23.63, -102.55, 'Mexico', 'MEX'], ['brazil', -14.24, -51.93, 'Brazil', 'BRA'],
  ['venezuela', 6.42, -66.59, 'Venezuela', 'VEN'], ['colombia', 4.57, -74.3, 'Colombia', 'COL'],
  ['united kingdom', 54.2, -2.5, 'United Kingdom', 'GBR'], ['london', 51.51, -0.13, 'London', 'GBR'],
  ['france', 46.2, 2.2, 'France', 'FRA'], ['paris', 48.86, 2.35, 'Paris', 'FRA'],
  ['germany', 51.2, 10.4, 'Germany', 'DEU'], ['berlin', 52.52, 13.4, 'Berlin', 'DEU'],
  ['belgium', 50.5, 4.5, 'Belgium', 'BEL'], ['brussels', 50.85, 4.35, 'Brussels', 'BEL'],
  ['switzerland', 46.8, 8.2, 'Switzerland', 'CHE'], ['geneva', 46.2, 6.14, 'Geneva', 'CHE'],
  ['poland', 52.0, 19.0, 'Poland', 'POL'], ['warsaw', 52.23, 21.01, 'Warsaw', 'POL'],
  ['turkey', 39.0, 35.2, 'Turkey', 'TUR'], ['ankara', 39.93, 32.86, 'Ankara', 'TUR'],
  ['global', 20, 0, 'Global', 'GLOBAL'],
];

const rssFeeds = [
  ['BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
  ['BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
  ['Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'],
  ['France 24', 'https://www.france24.com/en/rss'],
  ['Deutsche Welle', 'https://rss.dw.com/rdf/rss-en-all'],
  ['UN News', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml'],
  ['Guardian World', 'https://www.theguardian.com/world/rss'],
  ['Guardian Business', 'https://www.theguardian.com/business/rss'],
  ['NPR World', 'https://feeds.npr.org/1004/rss.xml'],
  ['CBC World', 'https://www.cbc.ca/cmlink/rss-world'],
  ['Sky News World', 'https://feeds.skynews.com/feeds/rss/world.xml'],
  ['CBS World', 'https://www.cbsnews.com/latest/rss/world'],
  ['AP Top News', 'https://feeds.apnews.com/rss/apf-topnews'],
  ['AP World News', 'https://feeds.apnews.com/rss/apf-worldnews'],
  ['CNBC World Economy', 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362'],
  ['IMF News', 'https://www.imf.org/en/News/RSS?Language=ENG'],
  ['WTO News', 'https://www.wto.org/library/rss/latest_news_e.xml'],
  ['NATO News', 'https://www.nato.int/cps/en/natohq/news.xml'],
  ['EU Council', 'https://www.consilium.europa.eu/en/press/press-releases/rss/'],
  ['Federal Reserve', 'https://www.federalreserve.gov/feeds/press_all.xml'],
  ['US Treasury', 'https://home.treasury.gov/news/press-releases/rss'],
  ['USTR', 'https://ustr.gov/about-us/policy-offices/press-office/press-releases/feed'],
  ['US Commerce', 'https://www.commerce.gov/news/rss'],
  ['Defense News', 'https://www.defensenews.com/arc/outboundfeeds/rss/category/global/?outputType=xml'],
  ['Military Times', 'https://www.militarytimes.com/arc/outboundfeeds/rss/category/flashpoints/?outputType=xml'],
  ['Long War Journal', 'https://www.longwarjournal.org/feed'],
  ['Critical Threats', 'https://www.criticalthreats.org/rss'],
  ['The Aviationist', 'https://theaviationist.com/feed/'],
  ['Times of Israel', 'https://www.timesofisrael.com/feed/'],
  ['Arab News', 'https://www.arabnews.com/rss.xml'],
  ['The National', 'https://www.thenationalnews.com/arc/outboundfeeds/rss/'],
  ['Defense.gov', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=25'],
  ['White House', 'https://www.whitehouse.gov/briefing-room/statements-releases/feed/'],
  ['gCaptain', 'https://gcaptain.com/feed/'],
  ['Maritime Executive', 'https://maritime-executive.com/rss'],
  ['MarineLink', 'https://www.marinelink.com/news/rss'],
  ['Offshore Energy', 'https://www.offshore-energy.biz/feed/'],
];

const gdeltQueries = [
  'tariff OR tariffs OR sanctions OR "trade deal" OR "trade war" OR exports OR imports',
  '"central bank" OR inflation OR "interest rates" OR currency OR debt OR bonds OR recession',
  'oil OR gas OR energy OR pipeline OR "supply chain" OR semiconductor OR "rare earth"',
  'NATO OR BRICS OR "European Union" OR "United Nations" OR WTO OR IMF OR "World Bank" OR G7 OR G20',
  '"defense spending" OR "military aid" OR "arms deal" OR missile OR drone OR naval OR airstrike',
  '"multinational corporation" OR antitrust OR merger OR acquisition OR "foreign investment"',
  'shipping OR vessel OR port OR strait OR maritime OR tanker OR cargo',
  'earthquake OR flood OR wildfire OR cyclone OR hurricane OR typhoon OR volcano OR "state of emergency"',
  'cyberattack OR ransomware OR outage OR ddos OR "data breach"',
];

const conflictWords = /\b(war|airstrike|missile|rocket|drone|uav|explosion|blast|shelling|artillery|clash|clashes|fighting|offensive|evacuation|military|naval|vessel|tanker|strait|blockade|cyberattack|ransomware|ddos)\b/i;
const sportsNewsWords = /\b(sport|sports|soccer|football|basketball|baseball|hockey|tennis|golf|cricket|rugby|olympic|olympics|fifa|uefa|nba|nfl|mlb|nhl|wnba|ncaa|premier league|champions league|world cup|super bowl|grand slam|playoff|playoffs|matchday|tournament|stadium|coach|quarterback|striker|goalkeeper|pitcher)\b/i;
const strategicNewsWords = /\b(finance|financial|economy|economic|trade|tariff|tariffs|sanction|sanctions|export|exports|import|imports|supply chain|inflation|interest rate|central bank|currency|debt|bond|bonds|oil|gas|energy|pipeline|semiconductor|chip|rare earth|market|markets|investment|foreign investment|multinational|corporation|corporate|merger|acquisition|antitrust|regulation|policy|lawmakers|election|treaty|border|migration|defense|defence|military|naval|arms|missile|drone|airstrike|war|conflict|NATO|BRICS|European Union|EU|United Nations|UN|WTO|IMF|World Bank|G7|G20|OPEC|ASEAN|cyberattack|ransomware|data breach|shipping|maritime|port|strait|tanker|cargo)\b/i;
const majorNatureWords = /\b(earthquake|hurricane|typhoon|cyclone|flood|wildfire|volcano|tsunami|landslide|state of emergency|evacuation|catastrophe|disaster|fatalities|killed|dead|damage|blackout)\b/i;

function isSportsNews(item) {
  return sportsNewsWords.test(`${item.title || ''} ${item.description || ''} ${item.category || ''}`);
}

function newsRelevanceScore(item) {
  const text = `${item.title || ''} ${item.description || ''} ${item.category || ''} ${item.sourceName || ''}`;
  let score = 0;
  if (strategicNewsWords.test(text)) score += 6;
  if (majorNatureWords.test(text)) score += 4;
  if (/\b(IMF|World Bank|WTO|NATO|BRICS|European Union|United Nations|Federal Reserve|Treasury|USTR|Defense\.gov)\b/i.test(text)) score += 4;
  if (/\b(tariff|sanction|central bank|inflation|defense spending|military aid|semiconductor|rare earth|supply chain|oil|gas|shipping|port|cyberattack)\b/i.test(text)) score += 3;
  if (item.officialSource) score += 1;
  return score;
}

function isRelevantNews(item) {
  if (!item || isSportsNews(item)) return false;
  return newsRelevanceScore(item) > 0;
}

function htmlDecode(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashId(prefix, value) {
  let hash = 2166136261;
  for (const ch of String(value || '')) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function jitter(id, size = 0.55) {
  let hash = 0;
  for (const ch of String(id)) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return ((Math.abs(hash) % 1000) / 1000 - 0.5) * size;
}

function locate(text, id = '') {
  const lower = String(text || '').toLowerCase();
  const found = locations.find(([name]) => name !== 'global' && lower.includes(name));
  const loc = found || locations[locations.length - 1];
  return {
    lat: loc[1] + jitter(`${id}-lat`),
    lon: loc[2] + jitter(`${id}-lon`),
    city: loc[3],
    country: loc[4],
  };
}

function categoryFor(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(tariff|tariffs|sanction|sanctions|trade|economy|economic|inflation|interest rate|central bank|currency|debt|bond|oil|gas|energy|semiconductor|chip|rare earth|supply chain|market|markets)\b/.test(lower)) return 'ECONOMY';
  if (/\b(nato|brics|european union|\beu\b|united nations|\bun\b|wto|imf|world bank|g7|g20|opec|asean|treaty|diplomacy|summit)\b/.test(lower)) return 'DIPLOMACY';
  if (/\b(multinational|corporation|corporate|merger|acquisition|antitrust|foreign investment|regulation)\b/.test(lower)) return 'CORPORATE';
  if (/\b(vessel|ship|shipping|maritime|port|strait|tanker|cargo|naval)\b/.test(lower)) return 'MARITIME';
  if (/\b(earthquake|flood|storm|wildfire|cyclone|hurricane|typhoon|volcano|weather|tsunami|disaster)\b/.test(lower)) return 'CLIMATE';
  if (/\b(cyberattack|ransomware|ddos|outage|hack)\b/.test(lower)) return 'CYBER';
  if (conflictWords.test(lower)) return 'CONFLICT';
  return 'NEWS';
}

async function getText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'application/json,text/xml,application/xml,text/html,*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url) {
  return JSON.parse(await getText(url));
}

function sourceResult(name, ok, data, error) {
  return { name, ok, count: Array.isArray(data) ? data.length : 0, error: error ? String(error).slice(0, 180) : undefined };
}

async function settle(name, loader) {
  try {
    const data = await loader();
    return { name, ok: true, data };
  } catch (error) {
    return { name, ok: false, data: [], error: error.message };
  }
}

function parseRssItems(xml, sourceName) {
  return [...String(xml || '').matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match, index) => {
    const item = match[0];
    const take = tag => {
      const found = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return htmlDecode(found && found[1]);
    };
    const title = take('title');
    const description = take('description');
    const url = take('link') || take('guid');
    const ts = Date.parse(take('pubDate') || take('updated') || take('published')) || Date.now() - index * 60000;
    const id = hashId(`rss-${sourceName.toLowerCase().replace(/\W+/g, '-')}`, url || title);
    const located = locate(`${title} ${description}`, id);
    return {
      id,
      ...located,
      title,
      description: description.slice(0, 420),
      category: categoryFor(`${title} ${description}`),
      source: sourceName,
      sourceName,
      officialSource: false,
      url,
      sources: 1,
      ts,
    };
  }).filter(item => item.title && item.url);
}

async function loadRssNews() {
  const results = await Promise.all(rssFeeds.map(([name, url]) => settle(name, async () => parseRssItems(await getText(url), name))));
  return results.flatMap(result => result.data);
}

async function loadGdeltNews() {
  const batches = await Promise.all(gdeltQueries.map(query => settle(`gdelt-${query.slice(0, 12)}`, async () => {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    url.searchParams.set('query', query);
    url.searchParams.set('mode', 'ArtList');
    url.searchParams.set('format', 'json');
    url.searchParams.set('maxrecords', '250');
    url.searchParams.set('sort', 'HybridRel');
    const data = await getJson(url.toString());
    return (data.articles || []).map(article => {
      const title = htmlDecode(article.title);
      const description = htmlDecode(article.seendate || article.domain || '');
      const ts = parseGdeltDate(article.seendate) || Date.now();
      const id = hashId('gdelt', article.url || title);
      const located = locate(`${title} ${article.sourceCountry || ''}`, id);
      return {
        id,
        ...located,
        title,
        description,
        category: categoryFor(`${title} ${query}`),
        source: article.domain || 'gdeltproject.org',
        sourceName: 'GDELT',
        officialSource: false,
        url: article.url,
        image: article.socialimage,
        sources: 1,
        ts,
      };
    }).filter(item => item.title && item.url);
  })));
  return batches.flatMap(result => result.data);
}

function parseGdeltDate(value) {
  const text = String(value || '');
  const match = text.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return Date.parse(text);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
}

async function loadReliefWeb() {
  const url = new URL('https://api.reliefweb.int/v1/reports');
  url.searchParams.set('appname', 'globaldata');
  url.searchParams.set('profile', 'full');
  url.searchParams.set('limit', '200');
  url.searchParams.set('sort[]', 'date:desc');
  const data = await getJson(url.toString());
  return (data.data || []).map(item => {
    const fields = item.fields || {};
    const title = htmlDecode(fields.title);
    const countries = fields.country || [];
    const primary = countries[0] || {};
    const id = `reliefweb-${item.id}`;
    const located = locate(`${title} ${primary.name || ''}`, id);
    return {
      id,
      ...located,
      title,
      description: htmlDecode(fields.body || '').slice(0, 420),
      category: 'HUMANITARIAN',
      source: 'reliefweb.int',
      sourceName: 'ReliefWeb',
      officialSource: true,
      url: fields.url,
      sources: 1,
      ts: Date.parse(fields.date?.created || fields.date?.changed) || Date.now(),
    };
  }).filter(item => item.title && item.url);
}

function currentEventPages() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pages = [];
  const now = new Date();
  for (let offset = 0; offset < 10; offset += 1) {
    const day = new Date(now.getTime() - offset * 86400000);
    pages.push({
      page: `Portal:Current_events/${day.getUTCFullYear()}_${months[day.getUTCMonth()]}_${day.getUTCDate()}`,
      ts: Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12),
    });
  }
  return pages;
}

async function loadWikipediaCurrentEvents() {
  const pages = await Promise.all(currentEventPages().map(page => settle(page.page, async () => {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'parse');
    url.searchParams.set('page', page.page);
    url.searchParams.set('prop', 'text');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    const data = await getJson(url.toString());
    return { ...page, html: data.parse?.text?.['*'] || '' };
  })));
  const news = [];
  pages.filter(result => result.ok).forEach(({ data: page }) => {
    const lis = [...String(page.html).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(match => htmlDecode(match[1]))
      .filter(text => text.length > 55 && text.length < 280)
      .slice(0, 50);
    lis.forEach((title, index) => {
      const id = hashId('wiki-current', `${page.page}-${title}`);
      const located = locate(title, id);
      news.push({
        id,
        ...located,
        title,
        category: 'NEWS',
        source: 'wikipedia.org',
        sourceName: 'Wikipedia Current Events',
        officialSource: true,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.page.replace(/ /g, '_'))}`,
        sources: 1,
        ts: page.ts - index * 60000,
      });
    });
  });
  return news;
}

async function loadWikinews() {
  const url = 'https://en.wikinews.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Published&cmtype=page&cmprop=ids|title|timestamp&cmsort=timestamp&cmdir=desc&cmlimit=80&format=json&origin=*';
  const data = await getJson(url);
  return (data.query?.categorymembers || []).map(item => {
    const id = `wikinews-${item.pageid}`;
    const located = locate(item.title, id);
    return {
      id,
      ...located,
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

async function loadFlights() {
  const data = await getJson('https://api.airplanes.live/v2/point/0/0/10000');
  return (data.ac || data.aircraft || [])
    .map(plane => ({
      id: plane.hex || plane.icao || plane.flight || plane.r,
      callsign: String(plane.flight || plane.callsign || plane.r || plane.hex || '').trim(),
      country: plane.t || 'airplanes.live',
      lon: Number(plane.lon),
      lat: Number(plane.lat),
      alt: Number(plane.alt_baro === 'ground' ? 0 : plane.alt_baro || plane.alt_geom),
      velocity: Number(plane.gs),
      heading: Number(plane.track || plane.true_heading || plane.mag_heading),
      updated: Date.now() - Number(plane.seen || 0) * 1000,
      source: 'airplanes.live',
      live: true,
    }))
    .filter(plane => Number.isFinite(plane.lat) && Number.isFinite(plane.lon))
    .sort((a, b) => (b.updated || 0) - (a.updated || 0))
    .slice(0, 5000);
}

function normalizeLines(geometry) {
  const lines = [];
  if (!geometry) return lines;
  if (geometry.type === 'LineString') lines.push(geometry.coordinates);
  if (geometry.type === 'MultiLineString') geometry.coordinates.forEach(line => lines.push(line));
  return lines
    .map(line => line.map(([lon, lat]) => [Number(lat), Number(lon)]).filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)))
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

async function loadShippingLanes() {
  const data = await getJson('https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/main/data/Shipping_Lanes_v1.geojson');
  const lanes = [];
  (data.features || []).forEach((feature, index) => {
    normalizeLines(feature.geometry).forEach((points, part) => {
      lanes.push({ id: `shipping-${index}-${part}`, type: feature.properties?.Type || 'Route', pts: points });
    });
  });
  return lanes.slice(0, 500);
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
    .slice(0, 1600);
}

async function loadEarthquakes() {
  const data = await getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
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
  }).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon));
}

function dedupeNews(items) {
  const byKey = new Map();
  items.forEach(item => {
    if (!isRelevantNews(item)) return;
    const key = String(item.url || item.title || item.id).replace(/[?#].*$/, '').toLowerCase();
    if (!key || byKey.has(key)) return;
    byKey.set(key, { ...item, relevanceScore: newsRelevanceScore(item) });
  });
  return [...byKey.values()]
    .sort((a, b) => (b.relevanceScore - a.relevanceScore) || ((b.ts || 0) - (a.ts || 0)))
    .slice(0, MAX_NEWS);
}

function toConflictEvents(news) {
  return news
    .filter(item => item.category === 'CONFLICT' || conflictWords.test(`${item.title} ${item.description || ''}`))
    .map(item => ({
      id: `conflict-${item.id}`,
      lat: item.lat,
      lon: item.lon,
      title: item.title,
      country: item.city || item.country,
      source: item.source,
      url: item.url,
      ts: item.ts,
      fatalities: 0,
      level: item.category === 'CONFLICT' ? 0.62 : 0.38,
    }))
    .slice(0, MAX_CONFLICTS);
}

async function main() {
  const results = await Promise.all([
    settle('gdelt', loadGdeltNews),
    settle('rss', loadRssNews),
    settle('reliefweb', loadReliefWeb),
    settle('wikipedia-current', loadWikipediaCurrentEvents),
    settle('wikinews', loadWikinews),
    settle('flights', loadFlights),
    settle('shippingLanes', loadShippingLanes),
    settle('ports', loadPorts),
    settle('earthquakes', loadEarthquakes),
  ]);

  const get = name => results.find(result => result.name === name)?.data || [];
  const news = dedupeNews([
    ...get('gdelt'),
    ...get('rss'),
    ...get('reliefweb'),
    ...get('wikipedia-current'),
    ...get('wikinews'),
  ]);
  const shippingLanes = get('shippingLanes');
  const vessels = makeVesselsFromLanes(shippingLanes);

  const payload = {
    strictLive: true,
    cached: true,
    staticCache: true,
    generatedAt: Date.now(),
    sources: [
      ...results.map(result => sourceResult(result.name, result.ok, result.data, result.error)),
      sourceResult('news', true, news),
      sourceResult('conflictEvents', true, toConflictEvents(news)),
      sourceResult('vessels', true, vessels, 'Estimated positions from public shipping lanes'),
    ],
    news,
    flights: get('flights'),
    shippingLanes,
    ports: get('ports'),
    vessels,
    militaryBases: [],
    militaryShips: [],
    conflictEvents: toConflictEvents(news),
    aisstream: [],
    earthquakes: get('earthquakes'),
    weather: [],
    kasperskyCyber: [],
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUT_FILE}`);
  console.log(payload.sources.map(source => `${source.name}:${source.count}${source.ok ? '' : '!'}`).join(' '));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
