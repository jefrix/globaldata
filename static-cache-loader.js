(function () {
  if (window.location.hostname !== 'jefrix.github.io') return;

  const fallbackFetch = window.fetch.bind(window);

  function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  function limitFromUrl(url, name, fallback, max) {
    try {
      const parsed = new URL(url);
      const value = Number(parsed.searchParams.get(name));
      if (!Number.isFinite(value)) return fallback;
      return Math.max(0, Math.min(max, Math.floor(value)));
    } catch {
      return fallback;
    }
  }

  async function loadCache(requestUrl) {
    const response = await fallbackFetch(`data/live-cache.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`cache HTTP ${response.status}`);
    const cache = await response.json();
    const hasData = (
      cache?.news?.length ||
      cache?.flights?.length ||
      cache?.shippingLanes?.length ||
      cache?.ports?.length
    );
    if (!hasData) throw new Error('cache empty');

    const flightLimit = limitFromUrl(requestUrl, 'limit', 2500, 5000);
    const objectLimit = limitFromUrl(requestUrl, 'objects', 3000, 5000);
    return {
      ...cache,
      strictLive: true,
      cached: true,
      staticCache: true,
      sources: [
        ...(cache.sources || []),
        { name: 'static-cache', ok: true, count: cache.news?.length || 0 },
      ],
      flights: (cache.flights || []).slice(0, flightLimit),
      news: (cache.news || []).slice(0, objectLimit),
      shippingLanes: (cache.shippingLanes || []).slice(0, Math.min(objectLimit, 500)),
      ports: (cache.ports || []).slice(0, Math.min(objectLimit, 1600)),
      conflictEvents: (cache.conflictEvents || []).slice(0, Math.min(objectLimit, 800)),
    };
  }

  window.fetch = function cachedFetch(input, options) {
    const url = typeof input === 'string' ? input : input && input.url;
    if (/^http:\/\/localhost:30(00|01|09)\/api\/live/.test(String(url || ''))) {
      return loadCache(String(url || '')).then(jsonResponse).catch(() => fallbackFetch(input, options));
    }
    return fallbackFetch(input, options);
  };
})();
