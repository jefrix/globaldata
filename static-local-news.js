(function () {
  const MAX_NEWS_AGE_MS = 5 * 24 * 60 * 60 * 1000;
  const SERVICE_TERMS = [
    'Georgia', 'Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Macon', 'Athens',
    'Warner Robins', 'Dublin', 'Statesboro', 'Valdosta', 'Brunswick', 'Albany',
    'Rome', 'Gainesville', 'Dalton', 'Chatham County', 'Fulton County',
    'Cobb County', 'Gwinnett County', 'Bibb County', 'Houston County',
    'Laurens County', 'Bulloch County',
  ];
  const TOPICS = [
    {
      id: 'business',
      label: 'BUSINESS',
      color: '#f58a42',
      terms: ['business', 'company', 'companies', 'corporate', 'headquarters', 'investment', 'expansion', 'layoffs', 'jobs', 'workforce', 'plant', 'facility', 'factory', 'warehouse', 'distribution center'],
    },
    {
      id: 'economy',
      label: 'ECONOMY',
      color: '#73ff9a',
      terms: ['economy', 'economic development', 'revenue', 'budget', 'tax', 'taxes', 'tariff', 'trade', 'inflation', 'housing market', 'labor market', 'unemployment', 'port traffic', 'supply chain'],
    },
    {
      id: 'industry',
      label: 'INDUSTRY',
      color: '#5bd7ff',
      terms: ['manufacturing', 'industrial', 'logistics', 'shipping', 'port', 'rail', 'freight', 'semiconductor', 'battery plant', 'EV plant', 'automotive', 'aerospace', 'agriculture', 'energy'],
    },
    {
      id: 'government',
      label: 'GOV / POLICY',
      color: '#ff3d8d',
      terms: ['governor', 'legislature', 'state senate', 'state house', 'mayor', 'commission', 'agency', 'regulation', 'policy', 'lawmakers', 'bill', 'permit', 'contract', 'procurement'],
    },
    {
      id: 'infrastructure',
      label: 'INFRA',
      color: '#f5d142',
      terms: ['infrastructure', 'transportation', 'GDOT', 'road project', 'bridge', 'highway', 'airport', 'port of savannah', 'power grid', 'utility', 'water system', 'broadband'],
    },
    {
      id: 'weather',
      label: 'MAJOR WEATHER',
      color: '#9fb7ff',
      terms: ['hurricane', 'tropical storm', 'tornado', 'flooding', 'severe weather', 'storm damage', 'state of emergency', 'disaster declaration'],
    },
  ];
  const CITY_POINTS = [
    { match: /atlanta|fulton|cobb|gwinnett|dekalb/i, city: 'Atlanta', lat: 33.7490, lon: -84.3880 },
    { match: /savannah|chatham/i, city: 'Savannah', lat: 32.0809, lon: -81.0912 },
    { match: /augusta|richmond/i, city: 'Augusta', lat: 33.4735, lon: -82.0105 },
    { match: /columbus|muscogee/i, city: 'Columbus', lat: 32.4609, lon: -84.9877 },
    { match: /statesboro|bulloch/i, city: 'Statesboro', lat: 32.4488, lon: -81.7832 },
    { match: /dublin|laurens/i, city: 'Dublin', lat: 32.5404, lon: -82.9038 },
    { match: /warner robins|houston/i, city: 'Warner Robins', lat: 32.6130, lon: -83.6242 },
    { match: /macon|bibb/i, city: 'Macon', lat: 32.8407, lon: -83.6324 },
    { match: /athens|clarke/i, city: 'Athens', lat: 33.9519, lon: -83.3576 },
    { match: /valdosta|lowndes/i, city: 'Valdosta', lat: 30.8327, lon: -83.2785 },
    { match: /brunswick|glynn/i, city: 'Brunswick', lat: 31.1499, lon: -81.4915 },
    { match: /albany|dougherty/i, city: 'Albany', lat: 31.5785, lon: -84.1557 },
    { match: /vidalia|toombs/i, city: 'Vidalia', lat: 32.2177, lon: -82.4135 },
    { match: /swainsboro|emanuel/i, city: 'Swainsboro', lat: 32.5974, lon: -82.3337 },
  ];
  const rejectWords = /\b(sports|football|basketball|baseball|soccer|golf|tennis|recruiting|playoff|championship|obituary|recipe|review|movie|music|concert|coupon|best restaurants|dating|celebrity|festival|arts?|theater|theatre|dance|lifestyle|fashion|wedding|podcast|book club|foodie|dining guide)\b/i;
  const relevanceWords = /\b(business|company|corporate|economic|economy|financial|finance|bank|investment|expansion|jobs|workforce|layoffs|plant|facility|factory|warehouse|industrial|manufacturing|logistics|shipping|port|rail|freight|supply chain|tariff|trade|budget|tax|revenue|governor|legislature|lawmakers|policy|regulation|bill|contract|procurement|infrastructure|transportation|GDOT|bridge|highway|airport|utility|power grid|hurricane|tropical storm|tornado|flooding|severe weather|disaster)\b/i;
  const gaScopeWords = new RegExp(`\\b(${SERVICE_TERMS.map(escapeRegExp).join('|')})\\b`, 'i');
  let active = false;
  let loaded = false;
  let loading = false;
  let cachedItems = [];
  let lastLoadedAt = 0;

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function ensureStyle() {
    if (document.querySelector('[data-local-news-style]')) return;
    const style = document.createElement('style');
    style.dataset.localNewsStyle = '1';
    style.textContent = `
      .local-news-layer {
        position: absolute;
        inset: 0;
        z-index: 7;
        display: none;
        pointer-events: none;
      }
      .local-news-panel {
        position: absolute;
        right: 22px;
        top: 58px;
        width: min(410px, calc(100vw - 390px));
        max-height: calc(100% - 118px);
        overflow: auto;
        border: 1px solid rgba(245,138,66,0.45);
        background: rgba(2,10,18,0.88);
        box-shadow: 0 0 22px rgba(245,138,66,0.18);
        pointer-events: auto;
      }
      .local-news-head {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(245,138,66,0.28);
        background: rgba(2,10,18,0.95);
        font-family: var(--mono);
        letter-spacing: 0.14em;
      }
      .local-news-title {
        color: #f58a42;
        font-size: 10px;
        font-weight: 600;
      }
      .local-news-status {
        color: var(--text-dim);
        font-size: 8.5px;
        white-space: nowrap;
      }
      .local-news-list {
        display: grid;
      }
      .local-news-item {
        display: grid;
        gap: 5px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(26,49,83,0.45);
        color: var(--text);
        text-decoration: none;
      }
      .local-news-item:hover {
        background: rgba(245,138,66,0.10);
      }
      .local-news-meta {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-family: var(--mono);
        font-size: 8px;
        letter-spacing: 0.12em;
        color: var(--text-dim);
      }
      .local-news-topic {
        color: var(--topic-color, #f58a42);
      }
      .local-news-text {
        font-size: 12px;
        line-height: 1.32;
      }
      .local-news-source {
        font-family: var(--mono);
        font-size: 8px;
        letter-spacing: 0.12em;
        color: var(--text-dim);
      }
      .local-news-empty {
        padding: 14px 12px;
        color: var(--text-dim);
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.12em;
        line-height: 1.45;
      }
      .local-placeholder-layer[data-local-placeholder="localNews"] .local-placeholder-badge {
        display: none;
      }
      @media (max-width: 900px) {
        .local-news-panel {
          left: 12px;
          right: 12px;
          top: 52px;
          width: auto;
          max-height: 42%;
        }
      }
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
    layer.innerHTML = [
      '<div class="local-news-panel">',
      '<div class="local-news-head">',
      '<div class="local-news-title">GEORGIA NEWS / BUSINESS + POLICY / 5D</div>',
      '<div class="local-news-status" data-local-news-status>READY</div>',
      '</div>',
      '<div class="local-news-list" data-local-news-list></div>',
      '</div>',
    ].join('');
    wrap.appendChild(layer);
    return layer;
  }

  function topicQuery(topic) {
    const service = SERVICE_TERMS.map(term => `"${term}"`).join(' OR ');
    const terms = topic.terms.map(term => `"${term}"`).join(' OR ');
    return `((${terms}) (${service}) sourcecountry:US sourcelang:English)`;
  }

  function gdeltUrl(topic) {
    const params = new URLSearchParams({
      query: topicQuery(topic),
      mode: 'artlist',
      format: 'json',
      sort: 'datedesc',
      maxrecords: '35',
      timespan: '5d',
    });
    return `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  }

  async function loadTopic(topic) {
    const response = await fetch(gdeltUrl(topic));
    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const data = await response.json();
    return (data.articles || []).map(article => normalizeArticle(article, topic)).filter(Boolean);
  }

  async function loadTopicWithRetry(topic) {
    try {
      return await loadTopic(topic);
    } catch (error) {
      if (!/429/.test(String(error?.message || error))) throw error;
      await wait(1400);
      return loadTopic(topic);
    }
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function normalizeArticle(article, topic) {
    const title = compact(article.title);
    const url = article.url || '';
    const domain = article.domain || sourceDomain(url);
    const seen = Date.parse(article.seendate || article.datetime || article.date || '') || Date.now();
    const text = `${title} ${domain}`;
    if (Date.now() - seen > MAX_NEWS_AGE_MS) return null;
    if (!title || rejectWords.test(text)) return null;
    if (!isCompanyRelevant(text, topic.id)) return null;
    if (!gaScopeWords.test(text)) return null;
    const point = CITY_POINTS.find(item => item.match.test(text)) || { city: 'Georgia', lat: 32.8407, lon: -83.6324 };
    return {
      id: `local-news-${topic.id}-${hash(`${title}-${url}`)}`,
      topic: topic.id,
      topicLabel: topic.label,
      color: topic.color,
      title,
      url,
      domain,
      city: point.city,
      lat: point.lat,
      lon: point.lon,
      ts: seen,
      source: 'GDELT / Georgia business-policy filter',
    };
  }

  function isCompanyRelevant(text, topicId) {
    if (!relevanceWords.test(text)) return false;
    if (topicId === 'business') return /\b(business|company|corporate|headquarters|investment|expansion|jobs|workforce|layoffs|plant|facility|factory|warehouse|distribution center)\b/i.test(text);
    if (topicId === 'economy') return /\b(economy|economic development|revenue|budget|tax|tariff|trade|inflation|housing market|labor market|unemployment|port traffic|supply chain)\b/i.test(text);
    if (topicId === 'industry') return /\b(manufacturing|industrial|logistics|shipping|port|rail|freight|semiconductor|battery plant|EV plant|automotive|aerospace|agriculture|energy)\b/i.test(text);
    if (topicId === 'government') return /\b(governor|legislature|state senate|state house|mayor|commission|agency|regulation|policy|lawmakers|bill|permit|contract|procurement)\b/i.test(text);
    if (topicId === 'infrastructure') return /\b(infrastructure|transportation|GDOT|road project|bridge|highway|airport|port of savannah|power grid|utility|water system|broadband)\b/i.test(text);
    if (topicId === 'weather') return /\b(hurricane|tropical storm|tornado|flooding|severe weather|storm damage|state of emergency|disaster declaration)\b/i.test(text);
    return relevanceWords.test(text);
  }

  function compact(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sourceDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'source';
    }
  }

  function hash(value) {
    let output = 0;
    for (let index = 0; index < value.length; index += 1) {
      output = ((output << 5) - output + value.charCodeAt(index)) | 0;
    }
    return Math.abs(output).toString(36);
  }

  async function loadGeorgia511() {
    const key = window.GLOBALDATA_GA511_KEY || localStorage.getItem('gd_ga511_key');
    if (!key) return [];
    const url = `https://511ga.org/api/v2/get/event?format=json&key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`511GA ${response.status}`);
    const data = await response.json();
    const rows = Array.isArray(data) ? data : (data.Events || data.events || []);
    return rows.map(event => {
      const desc = compact(event.Description || event.description || event.EventDescription);
      const road = compact(event.RoadwayName || event.roadwayName || event.route);
      const text = `${road} ${desc}`;
      const ts = Number(event.Reported || event.reported || 0) * 1000 || Date.now();
      if (Date.now() - ts > MAX_NEWS_AGE_MS) return null;
      if (!/\b(closure|closed|detour|lane|traffic shift|construction|bridge|interstate|highway)\b/i.test(text)) return null;
      const point = CITY_POINTS.find(item => item.match.test(text)) || { city: 'Georgia', lat: 32.8407, lon: -83.6324 };
      return {
        id: `ga511-${event.ID || hash(text)}`,
        topic: 'infrastructure',
        topicLabel: 'INFRA',
        color: '#f5d142',
        title: `${road || 'Georgia road'}: ${desc || 'Traffic event'}`,
        url: 'https://511ga.org/',
        domain: '511ga.org',
        city: point.city,
        lat: point.lat,
        lon: point.lon,
        ts,
        source: 'Georgia 511 infrastructure events',
      };
    }).filter(Boolean);
  }

  async function loadItems() {
    if (loading) return cachedItems;
    if (loaded && Date.now() - lastLoadedAt < 900000) return cachedItems;
    loading = true;
    try {
      const batches = [];
      for (const topic of TOPICS) {
        try {
          batches.push(await loadTopicWithRetry(topic));
        } catch {
          batches.push([]);
        }
        await wait(360);
      }
      try {
        batches.push(await loadGeorgia511());
      } catch {
        batches.push([]);
      }
      const byUrl = new Map();
      batches.forEach(batch => {
        batch.forEach(item => {
          const key = item.url || item.id;
          if (!byUrl.has(key)) byUrl.set(key, item);
        });
      });
      cachedItems = [...byUrl.values()]
        .filter(item => Date.now() - (Number(item.ts) || 0) <= MAX_NEWS_AGE_MS)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 80);
      loaded = true;
      lastLoadedAt = Date.now();
      return cachedItems;
    } finally {
      loading = false;
    }
  }

  function render(items) {
    const layer = ensureLayer();
    if (!layer) return;
    const list = layer.querySelector('[data-local-news-list]');
    const status = layer.querySelector('[data-local-news-status]');
    if (status) status.textContent = items.length ? `${items.length} MATCHES / 5D` : 'NO MATCHES / 5D';
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="local-news-empty">NO MATCHING GEORGIA BUSINESS, POLICY, INDUSTRIAL, OR MAJOR WEATHER NEWS FOUND IN THE LAST 5 DAYS.</div>';
      return;
    }
    list.replaceChildren(...items.map(item => {
      const anchor = document.createElement('a');
      anchor.className = 'local-news-item';
      anchor.href = item.url || '#';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.setProperty('--topic-color', item.color);
      anchor.innerHTML = [
        '<div class="local-news-meta">',
        `<span class="local-news-topic">${escapeHtml(item.topicLabel)}</span>`,
        `<span>${escapeHtml(item.city)} / ${timeAgo(item.ts)}</span>`,
        '</div>',
        `<div class="local-news-text">${escapeHtml(item.title)}</div>`,
        `<div class="local-news-source">${escapeHtml(item.domain)} / ${escapeHtml(item.source)}</div>`,
      ].join('');
      return anchor;
    }));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function timeAgo(ts) {
    const delta = Math.max(0, Date.now() - (Number(ts) || Date.now()));
    const hours = Math.floor(delta / 3600000);
    if (hours < 1) return 'NOW';
    if (hours < 48) return `${hours}H`;
    return `${Math.floor(hours / 24)}D`;
  }

  function setActive(next) {
    const layer = ensureLayer();
    if (!layer) return;
    const nextActive = Boolean(next);
    const changed = active !== nextActive || layer.style.display !== (nextActive ? 'block' : 'none');
    active = nextActive;
    if (!changed && (!active || loaded || loading)) return;
    layer.style.display = active ? 'block' : 'none';
    if (!active) return;
    const status = layer.querySelector('[data-local-news-status]');
    if (status) status.textContent = loaded ? `${cachedItems.length} MATCHES` : 'LOADING';
    render(cachedItems);
    loadItems().then(items => {
      if (active) render(items);
    }).catch(() => {
      if (status) status.textContent = 'SOURCE ERROR';
      render(cachedItems);
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
    const next = Boolean(localMode && marker && marker.style.display !== 'none');
    setActive(next);
    const rowSub = document.querySelector('[data-local-menu-layer="localNews"] .layer-sub');
    if (rowSub) rowSub.textContent = 'GA BUSINESS / POLICY / INDUSTRY / 5D';
  }

  setInterval(syncFromLocalMenu, 300);
})();
