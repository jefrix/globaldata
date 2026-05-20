(function () {
  const STATIC_CACHE_HOSTS = ['jefrix.github.io', 'localhost', '127.0.0.1'];
  if (!STATIC_CACHE_HOSTS.includes(window.location.hostname)) return;

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
    const shippingLanes = (cache.shippingLanes || []).slice(0, Math.min(objectLimit, 500));
    const vessels = (cache.vessels && cache.vessels.length ? cache.vessels : makeVesselsFromLanes(shippingLanes))
      .slice(0, Math.min(objectLimit, 5000));
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
      militaryFlights: (cache.militaryFlights || []).slice(0, Math.min(objectLimit, 1000)),
      news: (cache.news || []).slice(0, objectLimit),
      shippingLanes,
      ports: (cache.ports || []).slice(0, Math.min(objectLimit, 1600)).map(enrichPort),
      vessels,
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
