(function () {
  const MAX_NEWS_AGE_DAYS = 30;
  const MAX_NEWS_AGE_MS = MAX_NEWS_AGE_DAYS * 24 * 60 * 60 * 1000;
  const REQUEST_PAUSE_MS = 700;

  const COUNTY_NAMES = [
    'Appling', 'Atkinson', 'Bacon', 'Baker', 'Baldwin', 'Banks', 'Barrow', 'Bartow', 'Ben Hill', 'Berrien',
    'Bibb', 'Bleckley', 'Brantley', 'Brooks', 'Bryan', 'Bulloch', 'Burke', 'Butts', 'Calhoun', 'Camden',
    'Candler', 'Carroll', 'Catoosa', 'Charlton', 'Chatham', 'Chattahoochee', 'Chattooga', 'Cherokee', 'Clarke',
    'Clay', 'Clayton', 'Clinch', 'Cobb', 'Coffee', 'Colquitt', 'Columbia', 'Cook', 'Coweta', 'Crawford',
    'Crisp', 'Dade', 'Dawson', 'Decatur', 'DeKalb', 'Dodge', 'Dooly', 'Dougherty', 'Douglas', 'Early',
    'Echols', 'Effingham', 'Elbert', 'Emanuel', 'Evans', 'Fannin', 'Fayette', 'Floyd', 'Forsyth', 'Franklin',
    'Fulton', 'Gilmer', 'Glascock', 'Glynn', 'Gordon', 'Grady', 'Greene', 'Gwinnett', 'Habersham', 'Hall',
    'Hancock', 'Haralson', 'Harris', 'Hart', 'Heard', 'Henry', 'Houston', 'Irwin', 'Jackson', 'Jasper',
    'Jeff Davis', 'Jefferson', 'Jenkins', 'Johnson', 'Jones', 'Lamar', 'Lanier', 'Laurens', 'Lee', 'Liberty',
    'Lincoln', 'Long', 'Lowndes', 'Lumpkin', 'Macon', 'Madison', 'Marion', 'McDuffie', 'McIntosh', 'Meriwether',
    'Miller', 'Mitchell', 'Monroe', 'Montgomery', 'Morgan', 'Murray', 'Muscogee', 'Newton', 'Oconee', 'Oglethorpe',
    'Paulding', 'Peach', 'Pickens', 'Pierce', 'Pike', 'Polk', 'Pulaski', 'Putnam', 'Quitman', 'Rabun',
    'Randolph', 'Richmond', 'Rockdale', 'Schley', 'Screven', 'Seminole', 'Spalding', 'Stephens', 'Stewart',
    'Sumter', 'Talbot', 'Taliaferro', 'Tattnall', 'Taylor', 'Telfair', 'Terrell', 'Thomas', 'Tift', 'Toombs',
    'Towns', 'Treutlen', 'Troup', 'Turner', 'Twiggs', 'Union', 'Upson', 'Walker', 'Walton', 'Ware',
    'Warren', 'Washington', 'Wayne', 'Webster', 'Wheeler', 'White', 'Whitfield', 'Wilcox', 'Wilkes', 'Wilkinson',
    'Worth',
  ];

  const CITY_TO_COUNTY = [
    ['atlanta', 'Fulton'], ['sandy springs', 'Fulton'], ['roswell', 'Fulton'], ['alpharetta', 'Fulton'],
    ['savannah', 'Chatham'], ['pooler', 'Chatham'], ['garden city', 'Chatham'],
    ['augusta', 'Richmond'], ['columbus', 'Muscogee'], ['macon', 'Bibb'], ['athens', 'Clarke'],
    ['warner robins', 'Houston'], ['dublin', 'Laurens'], ['statesboro', 'Bulloch'], ['brunswick', 'Glynn'],
    ['valdosta', 'Lowndes'], ['albany', 'Dougherty'], ['gainesville', 'Hall'], ['rome', 'Floyd'],
    ['newnan', 'Coweta'], ['peachtree city', 'Fayette'], ['marietta', 'Cobb'], ['smyrna', 'Cobb'],
    ['kennesaw', 'Cobb'], ['lawrenceville', 'Gwinnett'], ['norcross', 'Gwinnett'], ['duluth', 'Gwinnett'],
    ['decatur', 'DeKalb'], ['stonecrest', 'DeKalb'], ['tucker', 'DeKalb'], ['brookhaven', 'DeKalb'],
    ['hinesville', 'Liberty'], ['vidalia', 'Toombs'], ['swainsboro', 'Emanuel'], ['metter', 'Candler'],
    ['perry', 'Houston'], ['tifton', 'Tift'], ['waycross', 'Ware'], ['cartersville', 'Bartow'],
    ['dalton', 'Whitfield'], ['douglasville', 'Douglas'], ['griffin', 'Spalding'], ['stockbridge', 'Henry'],
    ['mcdonough', 'Henry'], ['thomasville', 'Thomas'], ['milledgeville', 'Baldwin'], ['americus', 'Sumter'],
    ['covington', 'Newton'], ['carrollton', 'Carroll'], ['lagrange', 'Troup'], ['calhoun', 'Gordon'],
    ['bainbridge', 'Decatur'], ['moultrie', 'Colquitt'], ['jesup', 'Wayne'], ['eastman', 'Dodge'],
    ['jefferson', 'Jackson'], ['madison', 'Morgan'], ['blue ridge', 'Fannin'],
  ];

  const GEORGIA_TERMS = [
    'Georgia', 'GA', 'Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon', 'Athens', 'Warner Robins',
    'Dublin', 'Statesboro', 'Valdosta', 'Brunswick', 'Albany', 'Gainesville', 'Rome', 'Newnan',
    'Marietta', 'Lawrenceville', 'Gwinnett', 'Cobb', 'DeKalb', 'Fulton', 'Chatham', 'Bibb', 'Bulloch',
    'Georgia Power', 'Georgia DOT', 'GDOT', 'Georgia ports', 'Port of Savannah', 'Gov. Brian Kemp',
    'Georgia lawmakers', 'Georgia General Assembly', 'Atlanta Fed',
  ];

  const GDELT_QUERIES = [
    {
      label: 'GEORGIA SOURCES',
      query: [
        'domain:ajc.com', 'domain:gpb.org', 'domain:wabe.org', 'domain:georgiarecorder.com',
        'domain:wsbtv.com', 'domain:11alive.com', 'domain:fox5atlanta.com', 'domain:savannahnow.com',
        'domain:macon.com', 'domain:ledger-enquirer.com', 'domain:augustachronicle.com',
        'domain:valdostadailytimes.com', 'domain:albanyherald.com',
      ].join(' OR '),
    },
    {
      label: 'GEORGIA TERMS',
      query: [
        '"Georgia economy"', '"Georgia business"', '"Georgia jobs"', '"Georgia layoffs"', '"Georgia plant"',
        '"Georgia port"', '"Port of Savannah"', '"Georgia Power"', '"Georgia DOT"', '"Georgia lawmakers"',
        '"Atlanta business"', '"Savannah port"', '"Macon"', '"Augusta"', '"Columbus Georgia"',
      ].join(' OR '),
    },
  ];
  const RSS_JSON_SOURCES = [
    { label: 'Google News / Economy', url: googleNewsRss('Georgia economy OR Georgia business OR Georgia jobs OR Atlanta business OR Savannah port when:30d') },
    { label: 'Google News / Civic', url: googleNewsRss('Georgia governor OR Georgia lawmakers OR Georgia budget OR Georgia election OR Georgia policy when:30d') },
    { label: 'Google News / Infrastructure', url: googleNewsRss('Georgia DOT OR GDOT OR Georgia infrastructure OR Atlanta traffic OR Savannah port when:30d') },
    { label: 'Google News / Safety', url: googleNewsRss('Georgia crime OR Georgia weather OR Georgia hospital OR Georgia public safety when:30d') },
    { label: 'Georgia Recorder', url: 'https://georgiarecorder.com/feed/' },
  ];

  const LOCAL_SOURCE_DOMAINS = /\b(ajc\.com|gpb\.org|wabe\.org|georgiarecorder\.com|wsbtv\.com|11alive\.com|fox5atlanta\.com|savannahnow\.com|macon\.com|ledger-enquirer\.com|augustachronicle\.com|valdostadailytimes\.com|albanyherald\.com|mdjonline\.com|georgia\.gov)\b/i;
  const COUNTRY_GEORGIA_REJECT = /(^georgia:\s|\b(tbilisi|batumi|kutaisi|abkhazia|south ossetia|caucasus|georgian dream|georgia border|near georgia|border with georgia|republic of georgia)\b)/i;
  const SPORTS_REJECT = /\b(sports?|football|basketball|baseball|soccer|golf|tennis|softball|volleyball|wrestling|lacrosse|track and field|cross country|swimming|playoff|championship|tournament|coach|quarterback|touchdown|recruiting|signing day|nfl|nba|mlb|nhl|wnba|ncaa|sec)\b/i;
  const YOUTH_REJECT = /\b(graduat(?:e|es|ion|ing)|commencement|honor roll|dean'?s list|student of the month|student athlete|valedictorian|salutatorian|scholarship winners?|youth sports|little league|high school(?:er|s)? (?:wins?|earns?|named|signs|graduates?)|academic achievement|academic accomplishments?|perfect attendance|prom)\b/i;
  const FRIVOLOUS_REJECT = /\b(recipe|things to do|weekend guide|concert|movie|celebrity|wedding|engagement|podcast|book club|fashion|coupon|horoscope|lottery numbers|pet of the week|restaurant review|best brunch|where to eat)\b/i;
  const NEWSWORTHY = /\b(econom(?:y|ic|ics)|business|jobs?|layoffs?|hiring|plant|factory|warehouse|manufactur(?:e|ing)|investment|development|construction|housing|real estate|port|shipping|logistics|supply chain|airport|rail|transit|traffic|road|bridge|interstate|closure|detour|infrastructure|energy|power|utility|water|wastewater|rate hike|tariff|trade|bank|federal reserve|inflation|budget|tax|revenue|grant|contract|policy|lawmakers?|legislature|governor|mayor|council|commission|election|lawsuit|court|judge|indict(?:ed|ment)|sentenc(?:ed|ing)|investigation|fraud|corruption|crime|shooting|homicide|arrest|police|sheriff|public safety|fire|ems|hospital|health|disease|outbreak|school board|university system|college closure|teacher pay|environment|weather|storm|tornado|flood|drought|hurricane|evacuation|emergency|disaster|fatal|dead|killed|damage|recall|cyberattack|data breach)\b/i;
  const STATE_CONTEXT = new RegExp(`\\b(${GEORGIA_TERMS.map(escapeRegExp).join('|')})\\b`, 'i');

  let active = false;
  let loaded = false;
  let loadingPromise = null;
  let cachedItems = [];
  let lastLoadedAt = 0;
  let lastErrorCount = 0;
  let selectedId = '';

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function ensureStyle() {
    if (document.querySelector('[data-local-news-style]')) return;
    const style = document.createElement('style');
    style.dataset.localNewsStyle = '1';
    style.textContent = `
      .local-news-layer { display: none !important; }
      .feed.local-news-feed-mode > .feed-head,
      .feed.local-news-feed-mode > .feed-list {
        display: none;
      }
      .local-news-board { height: 100%; min-height: 0; overflow-y: auto; font-family: var(--mono); color: var(--text); }
      .local-news-board::-webkit-scrollbar { width: 4px; }
      .local-news-board::-webkit-scrollbar-thumb { background: var(--edge); }
      .local-news-head { position: sticky; top: 0; z-index: 2; display: grid; gap: 4px; padding: 10px 12px; border-bottom: 1px solid rgba(245,138,66,0.28); background: rgba(2,10,18,0.96); letter-spacing: 0.14em; }
      .local-news-headline { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
      .local-news-title { color: #f58a42; font-size: 10px; font-weight: 600; }
      .local-news-status { color: var(--text-dim); font-size: 8.5px; white-space: nowrap; }
      .local-news-sub { color: var(--text-dim); font-size: 8px; line-height: 1.35; }
      .local-news-list { display: grid; }
      .local-news-item { display: grid; gap: 6px; width: 100%; padding: 10px 12px; border-bottom: 1px solid rgba(26,49,83,0.45); background: transparent; color: var(--text); text-align: left; cursor: pointer; outline: none; }
      .local-news-item:hover, .local-news-item:focus-visible, .local-news-item.selected { background: rgba(245,138,66,0.11); }
      .local-news-item.selected { box-shadow: inset 3px 0 0 var(--topic-color, #f58a42); }
      .local-news-meta { display: flex; justify-content: space-between; gap: 8px; font-family: var(--mono); font-size: 8px; letter-spacing: 0.12em; color: var(--text-dim); }
      .local-news-topic { color: var(--topic-color, #f58a42); }
      .local-news-text { font-size: 12px; line-height: 1.32; }
      .local-news-source-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .local-news-source { min-width: 0; font-family: var(--mono); font-size: 8px; letter-spacing: 0.12em; color: var(--text-dim); overflow-wrap: anywhere; }
      .local-news-source-button { flex: 0 0 auto; appearance: none; border: 1px solid rgba(245,138,66,0.48); background: rgba(245,138,66,0.08); color: #ffd1a8; cursor: pointer; padding: 4px 7px; font-family: var(--mono); font-size: 8px; letter-spacing: 0.14em; }
      .local-news-source-button:hover, .local-news-source-button:focus-visible { color: #050b17; background: #f58a42; outline: none; }
      .local-news-source-button:disabled { border-color: rgba(122,148,184,0.35); color: var(--text-dim); background: transparent; cursor: not-allowed; }
      .local-news-empty { padding: 14px 12px; color: var(--text-dim); font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; line-height: 1.45; }
      .local-placeholder-layer[data-local-placeholder="localNews"] .local-placeholder-badge { display: none; }
      @media (max-width: 900px) { .local-news-meta, .local-news-source-row { align-items: flex-start; flex-direction: column; } }
    `;
    document.head.appendChild(style);
  }

  function ensureLayer() {
    ensureStyle();
    const wrap = document.querySelector('.globe-wrap');
    if (!wrap) return null;
    let layer = wrap.querySelector('[data-local-news-layer]');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.className = 'local-news-layer';
    layer.dataset.localNewsLayer = '1';
    layer.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layer);
    return layer;
  }

  function ensureFeedBoard() {
    ensureStyle();
    const feed = document.querySelector('.rail-right .feed');
    if (!feed) return null;
    feed.classList.add('local-news-feed-mode');
    let board = feed.querySelector('[data-local-news-board]');
    if (board) return board;
    board = document.createElement('div');
    board.className = 'local-news-board';
    board.dataset.localNewsBoard = '1';
    board.innerHTML = [
      '<div class="local-news-head">',
      '<div class="local-news-headline">',
      '<div class="local-news-title" data-local-news-title>LOCAL NEWS / GEORGIA / 30D</div>',
      '<div class="local-news-status" data-local-news-status>READY</div>',
      '</div>',
      '<div class="local-news-sub">NON-SPORTS / ECONOMY / CIVIC / SAFETY / INFRASTRUCTURE</div>',
      '</div>',
      '<div class="local-news-list" data-local-news-list></div>',
    ].join('');
    feed.appendChild(board);
    return board;
  }

  function removeFeedBoard() {
    const feed = document.querySelector('.rail-right .feed.local-news-feed-mode');
    if (!feed) {
      if (window.GlobalDataLocalEventOwner === 'localNews') window.GlobalDataLocalEventOwner = '';
      return;
    }
    feed.classList.remove('local-news-feed-mode');
    feed.querySelector('[data-local-news-board]')?.remove();
    if (window.GlobalDataLocalEventOwner === 'localNews') window.GlobalDataLocalEventOwner = '';
  }

  function gdeltUrl(query) {
    const params = new URLSearchParams({
      query: `(${query}) sourcelang:english`,
      mode: 'artlist',
      format: 'json',
      sort: 'datedesc',
      maxrecords: '120',
      timespan: `${MAX_NEWS_AGE_DAYS}d`,
    });
    return `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  }

  function googleNewsRss(query) {
    const params = new URLSearchParams({
      q: query,
      hl: 'en-US',
      gl: 'US',
      ceid: 'US:en',
    });
    return `https://news.google.com/rss/search?${params}`;
  }

  async function loadGdeltBatch(source) {
    const response = await fetch(gdeltUrl(source.query));
    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const data = await response.json();
    return (data.articles || [])
      .map(article => normalizeArticle({
        title: article.title,
        url: article.url,
        domain: article.domain,
        ts: parseNewsDate(article.seendate || article.datetime || article.date),
        source: `GDELT / ${source.label}`,
      }))
      .filter(Boolean);
  }

  async function loadRemoteNews() {
    const batches = [];
    let errors = 0;
    for (const source of GDELT_QUERIES) {
      try {
        batches.push(await loadGdeltBatch(source));
      } catch {
        errors += 1;
        batches.push([]);
      }
      await wait(REQUEST_PAUSE_MS);
    }
    return { items: batches.flat(), errors };
  }

  async function loadRssJsonNews() {
    const batches = [];
    let errors = 0;
    for (const source of RSS_JSON_SOURCES) {
      try {
        const params = new URLSearchParams({ rss_url: source.url });
        const response = await fetch(`https://api.rss2json.com/v1/api.json?${params}`);
        if (!response.ok) throw new Error(`RSS ${response.status}`);
        const data = await response.json();
        if (data.status && data.status !== 'ok') throw new Error(data.message || 'RSS source error');
        batches.push((data.items || [])
          .map(item => normalizeArticle({
            title: item.title,
            url: item.link || item.guid,
            domain: sourceDomainFromRss(item, source),
            ts: parseNewsDate(item.pubDate),
            source: source.label,
            description: item.description || item.content,
          }))
          .filter(Boolean));
      } catch {
        errors += 1;
        batches.push([]);
      }
      await wait(REQUEST_PAUSE_MS);
    }
    return { items: batches.flat(), errors };
  }

  async function loadCacheNews() {
    try {
      const response = await fetch(`data/live-cache.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`cache ${response.status}`);
      const cache = await response.json();
      return (cache.news || [])
        .map(item => normalizeArticle({
          title: item.title,
          url: item.url,
          domain: item.source || item.sourceName || sourceDomain(item.url),
          ts: item.ts,
          source: 'static live cache',
          description: item.description,
        }))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async function loadItems() {
    if (loadingPromise) return loadingPromise;
    if (loaded && Date.now() - lastLoadedAt < 900000) return cachedItems;

    loadingPromise = (async () => {
      const [rss, cached] = await Promise.all([
        loadRssJsonNews().catch(() => ({ items: [], errors: RSS_JSON_SOURCES.length })),
        loadCacheNews(),
      ]);
      lastErrorCount = rss.errors || 0;
      cachedItems = mergeItems([...rss.items, ...cached]);
      loaded = true;
      lastLoadedAt = Date.now();
      loadRemoteNews()
        .then(remote => {
          lastErrorCount += remote.errors || 0;
          cachedItems = mergeItems([...cachedItems, ...remote.items]);
          if (active) render(cachedItems);
        })
        .catch(() => {
          lastErrorCount += GDELT_QUERIES.length;
        });
      return cachedItems;
    })().finally(() => {
      loadingPromise = null;
    });
    return loadingPromise;
  }

  function mergeItems(items) {
    const byUrl = new Map();
    items.forEach(item => {
      const key = item.url || item.id;
      if (!byUrl.has(key)) byUrl.set(key, item);
    });
    return [...byUrl.values()]
      .filter(item => Date.now() - (Number(item.ts) || 0) <= MAX_NEWS_AGE_MS)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 80);
  }

  function normalizeArticle(input) {
    const title = compact(input.title);
    const url = String(input.url || '');
    const domain = compact(input.domain || sourceDomain(url));
    const description = stripHtml(input.description || '');
    const text = compact(`${title} ${description} ${domain} ${url}`);
    if (!title || !passesFilters(text, domain)) return null;
    const geo = resolveGeo(text, domain);
    if (!geo) return null;
    const ts = Number(input.ts) || Date.now();
    if (Date.now() - ts > MAX_NEWS_AGE_MS) return null;
    const category = categoryFor(text);
    return {
      id: `local-news-${hash(`${title}-${url}`)}`,
      category,
      topicLabel: category,
      color: colorFor(category),
      title,
      url,
      domain: domain || 'source',
      countyName: geo.countyName,
      placeLabel: geo.placeLabel,
      ts,
      source: input.source || 'Georgia news',
    };
  }

  function passesFilters(text, domain) {
    if (COUNTRY_GEORGIA_REJECT.test(text) && !LOCAL_SOURCE_DOMAINS.test(domain)) return false;
    if (SPORTS_REJECT.test(text) || YOUTH_REJECT.test(text) || FRIVOLOUS_REJECT.test(text)) return false;
    if (!NEWSWORTHY.test(text)) return false;
    return hasGeorgiaContext(text, domain);
  }

  function hasGeorgiaContext(text, domain) {
    if (STATE_CONTEXT.test(text)) return true;
    if (resolveCountyName(text)) return true;
    return CITY_TO_COUNTY.some(([city]) => new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i').test(text));
  }

  function resolveGeo(text, domain) {
    const countyName = resolveCountyName(text);
    if (countyName) return { countyName, placeLabel: `${countyName} County` };

    const city = CITY_TO_COUNTY.find(([name]) => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text));
    if (city) return { countyName: city[1], placeLabel: `${titleCase(city[0])} / ${city[1]}` };

    if (/\b(atlanta|state capitol|governor|lawmakers?|general assembly|georgia state|georgia power|georgia dot|gdot)\b/i.test(text) || STATE_CONTEXT.test(text)) {
      return { countyName: 'Fulton', placeLabel: 'Statewide / Fulton' };
    }
    return null;
  }

  function resolveCountyName(text) {
    const fromDom = [...document.querySelectorAll('.local-county')]
      .map(node => node.dataset.countyName)
      .filter(Boolean);
    const counties = fromDom.length ? fromDom : COUNTY_NAMES;
    const explicit = counties.find(name => new RegExp(`\\b${escapeRegExp(name)}\\s+County\\b`, 'i').test(text));
    if (explicit) return explicit;
    const safeBare = ['Fulton', 'Cobb', 'DeKalb', 'Gwinnett', 'Chatham', 'Clayton', 'Cherokee', 'Forsyth', 'Coweta', 'Henry', 'Hall', 'Dougherty', 'Lowndes'];
    return safeBare.find(name => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)) || '';
  }

  function categoryFor(text) {
    if (/\b(port|shipping|logistics|supply chain|rail|airport|road|bridge|interstate|traffic|transit|gdot|closure|detour)\b/i.test(text)) return 'INFRA';
    if (/\b(storm|tornado|flood|hurricane|weather|drought|evacuation|emergency|disaster|damage)\b/i.test(text)) return 'WEATHER';
    if (/\b(crime|shooting|homicide|arrest|police|sheriff|fire|public safety|fraud|indict|sentenc|court|lawsuit|judge)\b/i.test(text)) return 'SAFETY';
    if (/\b(governor|mayor|council|commission|lawmakers|legislature|election|policy|budget|tax|grant)\b/i.test(text)) return 'CIVIC';
    if (/\b(health|hospital|disease|outbreak|medicaid|insurance)\b/i.test(text)) return 'HEALTH';
    if (/\b(school board|teacher pay|university system|college closure)\b/i.test(text)) return 'ED POLICY';
    return 'ECONOMY';
  }

  function colorFor(category) {
    return {
      ECONOMY: '#73ff9a',
      CIVIC: '#f5d142',
      SAFETY: '#ff7050',
      INFRA: '#5bd7ff',
      WEATHER: '#cfe2ff',
      HEALTH: '#ff3d8d',
      'ED POLICY': '#d9e4ef',
    }[category] || '#f58a42';
  }

  function render(items) {
    ensureLayer();
    if (!active) {
      removeFeedBoard();
      return;
    }
    const board = ensureFeedBoard();
    if (!board) return;
    const list = board.querySelector('[data-local-news-list]');
    const status = board.querySelector('[data-local-news-status]');
    if (status) {
      if (items.length) status.textContent = `${items.length} MATCHES / 30D`;
      else status.textContent = lastErrorCount ? 'SOURCE LIMITED / 30D' : 'NO MATCHES / 30D';
    }
    const rowSub = document.querySelector('[data-local-menu-layer="localNews"] .layer-sub');
    if (rowSub) rowSub.textContent = 'NON-SPORTS GA NEWS / 30D';
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="local-news-empty">NO MATCHING NON-SPORTS GEORGIA NEWS FOUND YET. LIVE SOURCES MAY BE RATE LIMITED; TRY AGAIN SHORTLY.</div>';
      return;
    }
    list.replaceChildren(...items.map(item => {
      const row = document.createElement('div');
      row.className = `local-news-item${item.id === selectedId ? ' selected' : ''}`;
      row.dataset.localNewsId = item.id;
      row.role = 'button';
      row.tabIndex = 0;
      row.style.setProperty('--topic-color', item.color);
      row.innerHTML = [
        '<div class="local-news-meta">',
        `<span class="local-news-topic">${escapeHtml(item.topicLabel)}</span>`,
        `<span>${escapeHtml(item.placeLabel)} / ${timeAgo(item.ts)}</span>`,
        '</div>',
        `<div class="local-news-text">${escapeHtml(item.title)}</div>`,
        '<div class="local-news-source-row">',
        `<div class="local-news-source">${escapeHtml(item.domain)} / ${escapeHtml(item.source)}</div>`,
        `<button type="button" class="local-news-source-button" data-local-news-source title="Open source article" ${item.url ? '' : 'disabled'}>SOURCE</button>`,
        '</div>',
      ].join('');
      row.addEventListener('click', () => selectNewsItem(item));
      row.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectNewsItem(item);
      });
      row.querySelector('[data-local-news-source]')?.addEventListener('click', event => {
        event.stopPropagation();
        openSource(item);
      });
      return row;
    }));
  }

  function selectNewsItem(item) {
    selectedId = item.id;
    window.GlobalDataLocalEventOwner = 'localNews';
    render(cachedItems);
    window.GlobalDataLocalMenu?.setLayer?.('counties', true);
    const detail = {
      featureType: 'county',
      name: item.countyName,
      title: `${item.countyName} County`,
      source: item.domain,
      note: item.title,
      localNewsItem: item,
      owner: 'localNews',
      suppressCountyBoard: true,
    };
    dispatchCountySelection(detail);
  }

  function openSource(item) {
    if (!item?.url) return;
    window.open(item.url, '_blank', 'noopener,noreferrer');
  }

  function dispatchCountySelection(detail, attempt = 0) {
    const hasCountyPath = [...document.querySelectorAll('.local-county')]
      .some(node => String(node.dataset.countyName || '').toLowerCase() === String(detail.name || '').toLowerCase());
    if (!hasCountyPath && attempt < 10) {
      setTimeout(() => dispatchCountySelection(detail, attempt + 1), 200);
      return;
    }
    window.dispatchEvent(new CustomEvent('globaldata:local-select', { detail }));
    setTimeout(() => window.GlobalDataCountyDrilldown?.renderCounty?.(detail), 80);
  }

  function setActive(next) {
    const layer = ensureLayer();
    if (!layer) return;
    const nextActive = Boolean(next);
    const changed = active !== nextActive || layer.style.display !== (nextActive ? 'block' : 'none');
    const hasFeedBoard = Boolean(document.querySelector('[data-local-news-board]'));
    active = nextActive;
    if (!changed && (!active || ((loaded || loadingPromise) && hasFeedBoard))) return;
    layer.style.display = active ? 'block' : 'none';
    if (!active) {
      const ownedSelection = window.GlobalDataLocalEventOwner === 'localNews';
      selectedId = '';
      removeFeedBoard();
      if (ownedSelection) window.GlobalDataCountyDrilldown?.clearSelection?.();
      return;
    }
    window.GlobalDataLocalEventOwner = 'localNews';
    const board = ensureFeedBoard();
    const status = board?.querySelector('[data-local-news-status]');
    if (status) status.textContent = loaded ? `${cachedItems.length} MATCHES / 30D` : 'LOADING';
    render(cachedItems);
    loadItems()
      .then(items => { if (active) render(items); })
      .catch(() => {
        lastErrorCount = GDELT_QUERIES.length;
        if (active) render(cachedItems);
      });
  }

  window.GlobalDataLocalNews = {
    setActive,
    getActive: () => active,
    refresh: () => {
      loaded = false;
      return loadItems().then(items => {
        if (active) render(items);
        return items;
      });
    },
  };

  function syncFromLocalMenu() {
    const marker = document.querySelector('[data-local-placeholder="localNews"]');
    const localMode = Boolean(document.querySelector('.globe-wrap.local-map-mode'));
    setActive(Boolean(localMode && marker && marker.style.display !== 'none'));
    const rowSub = document.querySelector('[data-local-menu-layer="localNews"] .layer-sub');
    if (rowSub) rowSub.textContent = 'NON-SPORTS GA NEWS / 30D';
  }

  function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function stripHtml(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&[^;\s]+;/g, ' ');
  }

  function parseNewsDate(value) {
    if (typeof value === 'number') return value;
    const raw = String(value || '').trim();
    const compactDate = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
    if (compactDate) {
      const [, y, mo, d, h, mi, s] = compactDate;
      return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function sourceDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'source';
    }
  }

  function sourceDomainFromRss(item, source) {
    const titleSource = String(item.title || '').match(/\s+-\s+([^-]{2,60})$/);
    if (titleSource && /google news/i.test(source.label)) return titleSource[1].trim();
    const domain = sourceDomain(item.link || item.guid);
    return domain === 'news.google.com' ? source.label : domain;
  }

  function hash(value) {
    let output = 0;
    for (let index = 0; index < value.length; index += 1) output = ((output << 5) - output + value.charCodeAt(index)) | 0;
    return Math.abs(output).toString(36);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function titleCase(value) {
    return String(value || '').replace(/\b\w/g, char => char.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function timeAgo(ts) {
    const delta = Math.max(0, Date.now() - (Number(ts) || Date.now()));
    const hours = Math.floor(delta / 3600000);
    if (hours < 1) return 'NOW';
    if (hours < 48) return `${hours}H`;
    return `${Math.floor(hours / 24)}D`;
  }

  setInterval(syncFromLocalMenu, 500);
})();
