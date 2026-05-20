(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) return;

  const RADIO_STYLE_ID = 'globaldata-radio-layer-style';
  const RADIO_LAYER_ID = 'radio';
  const RADIO_SOURCE = 'https://all.api.radio-browser.info';
  const STATION_LIMIT = 650;
  const CACHE_MS = 6 * 60 * 60 * 1000;
  const CACHE_KEY = 'globaldata_radio_stations_v2';
  const COLOR = '#ffcf47';
  const BAD_STATION_UUIDS = new Set([
    '65f5549e-a554-4386-9249-7f9651fd40f6', // Schwarzwaldradio duplicate geocoded into the Atlantic.
  ]);
  const originalCreate = window.GlobeEngine.create.bind(window.GlobeEngine);

  let stationPromise = null;
  let stationCache = null;
  let sharedAudio = null;

  function injectStyles() {
    if (document.getElementById(RADIO_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = RADIO_STYLE_ID;
    style.textContent = `
.radio-player {
  position: absolute;
  left: 22px;
  bottom: 22px;
  z-index: 8;
  width: min(430px, calc(100% - 44px));
  border: 1px solid rgba(255, 207, 71, 0.5);
  background: rgba(3, 12, 24, 0.92);
  box-shadow: 0 0 28px rgba(255, 207, 71, 0.14);
  color: var(--text, #d8e8ff);
  padding: 12px;
}
.radio-player[hidden] {
  display: none;
}
.radio-player-title {
  font: 700 14px/1.2 "Space Grotesk", sans-serif;
  letter-spacing: 0.12em;
  color: #ffcf47;
  margin-bottom: 4px;
}
.radio-player-meta {
  font: 600 10px/1.4 "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
  color: rgba(216, 235, 255, 0.72);
  margin-bottom: 10px;
}
.radio-player audio {
  display: block;
  width: 100%;
  height: 36px;
}
.radio-player-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.radio-player-actions a,
.radio-player-actions button {
  border: 1px solid rgba(255, 207, 71, 0.55);
  background: rgba(92, 52, 8, 0.44);
  color: #ffcf47;
  padding: 6px 9px;
  text-decoration: none;
  font: 700 10px/1 "JetBrains Mono", monospace;
  letter-spacing: 0.12em;
  cursor: pointer;
}
`;
    document.head.appendChild(style);
  }

  function ensureLayer(engine) {
    if (!engine.layerGroups[RADIO_LAYER_ID]) {
      const group = new THREE.Group();
      group.visible = false;
      engine.layerGroups[RADIO_LAYER_ID] = group;
      engine.root.add(group);
    }
  }

  function ensurePlayer() {
    injectStyles();
    const wrap = document.querySelector('.globe-wrap');
    if (!wrap) return null;
    let player = wrap.querySelector('.radio-player');
    if (player) return player;
    player = document.createElement('section');
    player.className = 'radio-player';
    player.hidden = true;
    player.innerHTML = `
      <div class="radio-player-title">RADIO STREAM</div>
      <div class="radio-player-meta">SELECT A STATION</div>
      <audio controls preload="none"></audio>
      <div class="radio-player-actions">
        <a data-radio-home target="_blank" rel="noopener" hidden>STATION SITE</a>
        <button type="button" data-radio-close>HIDE</button>
      </div>
    `;
    player.querySelector('[data-radio-close]')?.addEventListener('click', () => {
      player.hidden = true;
      const audio = player.querySelector('audio');
      if (audio) audio.pause();
    });
    wrap.appendChild(player);
    sharedAudio = player.querySelector('audio');
    return player;
  }

  function makeRadioTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(32, 32, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, 36);
    ctx.lineTo(32, 19);
    ctx.moveTo(24, 48);
    ctx.lineTo(32, 36);
    ctx.lineTo(40, 48);
    ctx.stroke();

    ctx.lineWidth = 3;
    [9, 17].forEach(radius => {
      ctx.globalAlpha = radius === 9 ? 0.95 : 0.58;
      ctx.beginPath();
      ctx.arc(32, 22, radius, -0.9, -2.25, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 22, radius, -0.24, 1.12);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(32, 36, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.58)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function radioMaterial(engine) {
    const key = `radio:${COLOR}`;
    if (!engine.markerMaterials[key]) {
      engine.markerMaterials[key] = new THREE.SpriteMaterial({
        map: makeRadioTexture(COLOR),
        color: 0xffffff,
        transparent: true,
        opacity: engine.layerOpacity.radio ?? 1,
        depthTest: true,
        depthWrite: false,
      });
    } else {
      engine.markerMaterials[key].opacity = engine.layerOpacity.radio ?? 1;
    }
    return engine.markerMaterials[key];
  }

  function normalizeStation(station) {
    if (BAD_STATION_UUIDS.has(station.stationuuid)) return null;
    const lat = Number(station.geo_lat);
    const lon = Number(station.geo_long);
    const streamUrl = station.url_resolved || station.url || '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (!/^https:\/\//i.test(streamUrl)) return null;
    return {
      id: station.stationuuid,
      stationuuid: station.stationuuid,
      name: station.name || 'Radio station',
      country: station.country || '--',
      countrycode: station.countrycode || '',
      state: station.state || '',
      language: station.language || '',
      tags: station.tags || '',
      codec: station.codec || '',
      bitrate: Number(station.bitrate) || 0,
      votes: Number(station.votes) || 0,
      lat,
      lon,
      homepage: station.homepage || '',
      favicon: station.favicon || '',
      url: station.url || '',
      url_resolved: streamUrl,
      lastcheckok: station.lastcheckok,
      streamHost: streamHost(streamUrl),
      sourceUrl: `${RADIO_SOURCE}/json/stations/byuuid/${encodeURIComponent(station.stationuuid || '')}`,
      sourceName: 'Radio Browser',
    };
  }

  function streamHost(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '--';
    }
  }

  function readCachedStations() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.stations) || Date.now() - Number(cached.ts || 0) > CACHE_MS) return null;
      return cached.stations;
    } catch {
      return null;
    }
  }

  function writeCachedStations(stations) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), stations }));
    } catch {}
  }

  function fetchStations() {
    if (stationCache?.length) return Promise.resolve(stationCache);
    const cached = readCachedStations();
    if (cached?.length) {
      stationCache = cached;
      return Promise.resolve(stationCache);
    }
    if (stationPromise) return stationPromise;
    const url = `${RADIO_SOURCE}/json/stations/search?has_geo_info=true&hidebroken=true&order=clickcount&reverse=true&limit=${STATION_LIMIT}`;
    stationPromise = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Radio Browser ${response.status}`);
        return response.json();
      })
      .then(rows => {
        stationCache = (Array.isArray(rows) ? rows : [])
          .map(normalizeStation)
          .filter(Boolean)
          .slice(0, STATION_LIMIT);
        writeCachedStations(stationCache);
        return stationCache;
      })
      .finally(() => {
        stationPromise = null;
      });
    return stationPromise;
  }

  function renderStations(engine, stations) {
    ensureLayer(engine);
    engine._clearGroup?.(RADIO_LAYER_ID);
    const material = radioMaterial(engine);
    stations.forEach((station, index) => {
      const votes = Number(station.votes) || 0;
      const size = Math.max(0.36, Math.min(0.71, 0.36 + Math.log10(votes + 10) * 0.065));
      const marker = engine._addSpritePoint?.(RADIO_LAYER_ID, station.lat, station.lon, material, size, size, 'radio', station, 102.6);
      if (marker) {
        marker.userData.baseScale = size;
        marker.userData.pulse = (index % 19) * 0.19;
        engine.registerZoomAdaptiveObject?.(marker, {
          baseX: size,
          baseY: size,
          minFactor: 0.62,
          maxFactor: 3.35,
          farShrink: 0.22,
          closeBoost: 2.35,
        });
      }
    });
    engine.radioStationsLoaded = true;
    window.GlobalDataRadioLayer.stationCount = stations.length;
  }

  function setRadioVisible(engine, visible) {
    ensureLayer(engine);
    engine.radioLayerWanted = Boolean(visible);
    engine.layerGroups.radio.visible = Boolean(visible);
    if (!visible) return;
    if (engine.radioStationsLoaded) return;
    fetchStations()
      .then(stations => {
        if (!engine.radioLayerWanted) return;
        renderStations(engine, stations);
        engine.layerGroups.radio.visible = true;
      })
      .catch(error => {
        console.warn('Radio Browser stations unavailable.', error);
      });
  }

  function playStation(station) {
    if (!station) return;
    const player = ensurePlayer();
    if (!player) return;
    const title = player.querySelector('.radio-player-title');
    const meta = player.querySelector('.radio-player-meta');
    const home = player.querySelector('[data-radio-home]');
    const audio = player.querySelector('audio');
    const uuid = station.stationuuid || station.id;
    const fallbackUrl = station.url_resolved || station.url;

    player.hidden = false;
    if (title) title.textContent = station.name || 'RADIO STREAM';
    if (meta) {
      const parts = [
        station.countrycode || station.country,
        station.codec,
        station.bitrate ? `${Math.round(Number(station.bitrate))} KBPS` : null,
      ].filter(Boolean);
      meta.textContent = parts.join(' / ') || 'LIVE STREAM';
    }
    if (home) {
      if (station.homepage) {
        home.hidden = false;
        home.href = station.homepage;
      } else {
        home.hidden = true;
        home.removeAttribute('href');
      }
    }
    if (!audio || !fallbackUrl) return;

    const clickUrl = uuid ? `${RADIO_SOURCE}/json/url/${encodeURIComponent(uuid)}` : '';
    const setAndPlay = url => {
      if (!url) return;
      audio.src = url;
      audio.play?.().catch(() => {});
    };
    if (!clickUrl) {
      setAndPlay(fallbackUrl);
      return;
    }
    fetch(clickUrl)
      .then(response => response.ok ? response.json() : null)
      .then(result => setAndPlay(result?.url || fallbackUrl))
      .catch(() => setAndPlay(fallbackUrl));
  }

  function patchEngine() {
    if (window.GlobeEngine.__radioLayerPatched) return;
    window.GlobeEngine.create = function radioAwareCreate(el, theme) {
      const engine = originalCreate(el, theme);
      ensureLayer(engine);
      ensurePlayer();

      const originalEnsure = engine._ensureLayerGroups?.bind(engine);
      const originalSetLayerVisible = engine.setLayerVisible?.bind(engine);
      const originalClear = engine._clearGroup?.bind(engine);
      engine._ensureLayerGroups = function radioEnsureLayerGroups() {
        originalEnsure?.();
        ensureLayer(engine);
      };
      engine._clearGroup = function radioClearGroup(id) {
        originalClear?.(id);
        if (id === RADIO_LAYER_ID) engine.radioStationsLoaded = false;
      };
      engine.setLayerVisible = function radioSetLayerVisible(id, visible) {
        if (id === RADIO_LAYER_ID) {
          setRadioVisible(engine, visible);
          return;
        }
        originalSetLayerVisible?.(id, visible);
      };
      engine._ensureLayerGroups();

      return engine;
    };
    window.GlobeEngine.__radioLayerPatched = true;
  }

  window.GlobalDataRadioLayer = {
    play: playStation,
    refresh: () => {
      stationCache = null;
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      return fetchStations();
    },
  };

  patchEngine();
})();
