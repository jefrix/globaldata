(function () {
  const SOLAR_STYLE_ID = 'globaldata-solar-layer-style';
  const DATA_REFRESH_MS = 10 * 60 * 1000;
  const IMAGE_REFRESH_MS = 5 * 60 * 1000;

  const SOLAR_VIEWS = {
    composite: {
      label: 'COMPOSITE',
      sub: 'EUV corona',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_211193171.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Multi-channel SDO composite showing coronal structure and active regions.',
    },
    euv193: {
      label: 'EUV 193',
      sub: 'corona',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Hot outer atmosphere view, useful for coronal holes and large-scale loops.',
    },
    euv171: {
      label: 'EUV 171',
      sub: 'loops',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Extreme ultraviolet channel highlighting quiet corona and magnetic loops.',
    },
    euv304: {
      label: 'EUV 304',
      sub: 'prominence',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Cooler plasma view for prominences, filaments, and limb activity.',
    },
    euv131: {
      label: 'EUV 131',
      sub: 'flares',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0131.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Hot flare-sensitive channel for energetic active regions.',
    },
    uv1600: {
      label: 'UV 1600',
      sub: 'upper photosphere',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_1600.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Ultraviolet view of the upper photosphere and transition region.',
    },
    sunspots: {
      label: 'SUNSPOTS',
      sub: 'visible disk',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'HMI continuum image showing sunspots and photospheric detail.',
    },
    magnetic: {
      label: 'MAGNETIC',
      sub: 'magnetogram',
      kind: 'image',
      url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIB.jpg',
      source: 'NASA SDO',
      sourceUrl: 'https://sdo.gsfc.nasa.gov/data/',
      note: 'Line-of-sight magnetic field view of active regions.',
    },
    xray: {
      label: 'X-RAY',
      sub: 'GOES flux',
      kind: 'data',
      source: 'NOAA SWPC',
      sourceUrl: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux',
    },
    flares: {
      label: 'FLARES',
      sub: 'latest',
      kind: 'data',
      source: 'NOAA SWPC',
      sourceUrl: 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json',
    },
    regions: {
      label: 'REGIONS',
      sub: 'sunspots',
      kind: 'data',
      source: 'NOAA SWPC',
      sourceUrl: 'https://services.swpc.noaa.gov/json/solar_regions.json',
    },
    cmes: {
      label: 'CMEs',
      sub: 'DONKI',
      kind: 'data',
      source: 'NASA DONKI',
      sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    },
  };

  let currentView = 'composite';
  let solarActive = false;
  let dataState = {
    status: 'idle',
    xray: [],
    flares: [],
    regions: [],
    cmes: [],
    updatedAt: null,
    error: '',
  };
  let dataPromise = null;
  let refreshTimer = null;

  function injectStyles() {
    if (document.getElementById(SOLAR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SOLAR_STYLE_ID;
    style.textContent = `
.globe-wrap.solar-mode .globe,
.globe-wrap.solar-mode .market-board,
.globe-wrap.solar-mode .zoom-controls,
.globe-wrap.solar-mode .bearing,
.globe-wrap.solar-mode .xh {
  opacity: 0;
  pointer-events: none;
}
.solar-overlay {
  position: absolute;
  inset: 0;
  z-index: 7;
  overflow: hidden;
  background:
    radial-gradient(circle at 58% 44%, rgba(255, 213, 92, 0.14), transparent 28%),
    radial-gradient(circle at 50% 50%, rgba(74, 193, 255, 0.08), transparent 48%),
    #020812;
  color: var(--text, #d8e8ff);
}
.solar-overlay[hidden] {
  display: none;
}
.solar-overlay::before {
  content: "";
  position: absolute;
  inset: -15%;
  background-image:
    linear-gradient(rgba(94, 178, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(94, 178, 255, 0.08) 1px, transparent 1px);
  background-size: 44px 44px;
  transform: perspective(800px) rotateX(58deg) scale(1.3);
  transform-origin: 50% 55%;
  opacity: 0.35;
}
.solar-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.26));
}
.solar-controls {
  position: absolute;
  left: 18px;
  top: 18px;
  width: min(230px, calc(100% - 36px));
  z-index: 3;
  border: 1px solid rgba(115, 176, 255, 0.35);
  background: rgba(3, 12, 24, 0.88);
  box-shadow: 0 0 28px rgba(0, 178, 255, 0.14);
  padding: 12px;
}
.solar-title {
  font: 700 14px/1.2 "Space Grotesk", sans-serif;
  letter-spacing: 0.16em;
  color: #ffd76b;
  margin-bottom: 3px;
}
.solar-subtitle {
  font: 500 10px/1.5 "JetBrains Mono", monospace;
  letter-spacing: 0.18em;
  color: rgba(208, 229, 255, 0.68);
  margin-bottom: 12px;
}
.solar-view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}
.solar-view-btn {
  min-height: 38px;
  border: 1px solid rgba(112, 174, 240, 0.45);
  background: rgba(6, 21, 38, 0.78);
  color: rgba(218, 235, 255, 0.82);
  font: 700 10px/1.1 "JetBrains Mono", monospace;
  letter-spacing: 0.12em;
  cursor: pointer;
  text-align: left;
  padding: 7px 8px;
}
.solar-view-btn span {
  display: block;
  margin-top: 4px;
  color: rgba(155, 197, 240, 0.66);
  font: 600 8px/1.1 "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
}
.solar-view-btn.is-active {
  border-color: #ffd84d;
  color: #fff2b0;
  background: rgba(94, 52, 6, 0.74);
  box-shadow: inset 0 0 0 1px rgba(255, 216, 77, 0.26), 0 0 16px rgba(255, 137, 38, 0.22);
}
.solar-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
  padding: 36px 36px 36px 280px;
}
.solar-disk-shell {
  position: relative;
  width: min(72vh, 62vw);
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  filter: drop-shadow(0 0 34px rgba(255, 196, 63, 0.34));
}
.solar-disk-shell::before,
.solar-disk-shell::after {
  content: "";
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  border: 1px solid rgba(255, 216, 77, 0.34);
  box-shadow: 0 0 38px rgba(255, 162, 64, 0.22);
}
.solar-disk-shell::after {
  inset: -17%;
  border-color: rgba(87, 195, 255, 0.18);
  box-shadow: 0 0 60px rgba(72, 183, 255, 0.16);
}
.solar-disk {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: radial-gradient(circle, #f8b03c, #35130a 70%, transparent 71%);
  box-shadow: inset 0 0 28px rgba(255,255,255,.18), 0 0 56px rgba(255, 157, 44, 0.4);
}
.solar-caption,
.solar-data-panel {
  position: absolute;
  right: 26px;
  bottom: 24px;
  z-index: 4;
  width: min(430px, calc(100% - 320px));
  border: 1px solid rgba(115, 176, 255, 0.35);
  background: rgba(3, 12, 24, 0.88);
  box-shadow: 0 0 28px rgba(0, 178, 255, 0.12);
  padding: 14px;
}
.solar-caption h3,
.solar-data-panel h3 {
  margin: 0 0 6px;
  font: 700 15px/1.2 "Space Grotesk", sans-serif;
  letter-spacing: 0.12em;
  color: #fff3b8;
}
.solar-caption p,
.solar-data-panel p {
  margin: 0;
  font: 500 11px/1.55 "JetBrains Mono", monospace;
  letter-spacing: 0.08em;
  color: rgba(217, 235, 255, 0.74);
}
.solar-source-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.solar-source-btn {
  border: 1px solid rgba(255, 216, 77, 0.54);
  color: #ffd84d;
  text-decoration: none;
  padding: 6px 9px;
  font: 700 10px/1 "JetBrains Mono", monospace;
  letter-spacing: 0.12em;
  background: rgba(92, 52, 8, 0.44);
}
.solar-data-panel {
  top: 32px;
  bottom: auto;
  max-height: calc(100% - 64px);
  overflow: auto;
}
.solar-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0;
}
.solar-metric,
.solar-card {
  border: 1px solid rgba(104, 168, 238, 0.26);
  background: rgba(10, 25, 44, 0.68);
  padding: 10px;
}
.solar-metric b {
  display: block;
  font: 800 18px/1.1 "Space Grotesk", sans-serif;
  color: #ffffff;
  letter-spacing: 0.08em;
}
.solar-metric span,
.solar-card span {
  display: block;
  margin-top: 4px;
  color: rgba(156, 198, 241, 0.72);
  font: 600 9px/1.3 "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
}
.solar-card {
  margin-top: 9px;
}
.solar-card strong {
  display: block;
  color: #fff3b8;
  font: 700 12px/1.25 "Space Grotesk", sans-serif;
  letter-spacing: 0.1em;
}
.solar-card p {
  margin-top: 5px;
}
@media (max-width: 920px) {
  .solar-stage {
    padding: 250px 18px 18px;
  }
  .solar-disk-shell {
    width: min(58vh, 86vw);
  }
  .solar-caption,
  .solar-data-panel {
    left: 18px;
    right: 18px;
    width: auto;
  }
  .solar-data-panel {
    top: 250px;
  }
}
`;
    document.head.appendChild(style);
  }

  function ensureOverlay(container) {
    injectStyles();
    const wrap = container && container.closest ? container.closest('.globe-wrap') : null;
    if (!wrap) return null;
    let overlay = wrap.querySelector('.solar-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('section');
    overlay.className = 'solar-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="solar-controls">
        <div class="solar-title">SOLAR WATCH</div>
        <div class="solar-subtitle">NASA SDO / NOAA SWPC</div>
        <div class="solar-view-grid"></div>
      </div>
      <div class="solar-stage"></div>
      <div class="solar-caption"></div>
    `;
    wrap.appendChild(overlay);

    const grid = overlay.querySelector('.solar-view-grid');
    Object.entries(SOLAR_VIEWS).forEach(([id, view]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'solar-view-btn';
      button.dataset.solarView = id;
      button.innerHTML = `${escapeHtml(view.label)}<span>${escapeHtml(view.sub || '')}</span>`;
      button.addEventListener('click', () => setSolarView(id, overlay));
      grid.appendChild(button);
    });

    renderSolarOverlay(overlay);
    return overlay;
  }

  function setSolarMode(container, enabled) {
    const overlay = ensureOverlay(container);
    const wrap = container && container.closest ? container.closest('.globe-wrap') : null;
    solarActive = Boolean(enabled);
    if (wrap) wrap.classList.toggle('solar-mode', solarActive);
    if (overlay) {
      overlay.hidden = !solarActive;
      if (solarActive) {
        ensureSolarData();
        renderSolarOverlay(overlay);
        startRefresh(overlay);
      } else {
        stopRefresh();
      }
    }
  }

  function setSolarView(id, overlay) {
    if (!SOLAR_VIEWS[id]) return;
    currentView = id;
    ensureSolarData();
    renderSolarOverlay(overlay);
  }

  function renderSolarOverlay(overlay) {
    if (!overlay) return;
    overlay.querySelectorAll('.solar-view-btn').forEach(button => {
      button.classList.toggle('is-active', button.dataset.solarView === currentView);
    });

    const view = SOLAR_VIEWS[currentView] || SOLAR_VIEWS.composite;
    const stage = overlay.querySelector('.solar-stage');
    const caption = overlay.querySelector('.solar-caption');
    if (!stage || !caption) return;

    if (view.kind === 'image') {
      stage.innerHTML = `
        <div class="solar-disk-shell">
          <img class="solar-disk" alt="${escapeHtml(view.label)} solar imagery" src="${cacheBust(view.url)}" />
        </div>
      `;
      caption.className = 'solar-caption';
      caption.innerHTML = `
        <h3>${escapeHtml(view.label)} / ${escapeHtml(view.source)}</h3>
        <p>${escapeHtml(view.note || '')}</p>
        ${renderSolarSummary()}
        <div class="solar-source-row">
          <a class="solar-source-btn" href="${escapeAttr(view.sourceUrl)}" target="_blank" rel="noopener">SOURCE</a>
          <a class="solar-source-btn" href="${escapeAttr(view.url)}" target="_blank" rel="noopener">IMAGE</a>
        </div>
      `;
      return;
    }

    stage.innerHTML = `
      <div class="solar-disk-shell" aria-hidden="true">
        <img class="solar-disk" alt="" src="${cacheBust(SOLAR_VIEWS.composite.url)}" />
      </div>
    `;
    caption.className = 'solar-data-panel';
    caption.innerHTML = renderDataView(currentView, view);
  }

  function renderSolarSummary() {
    const latest = latestXrayPoint();
    const flare = Array.isArray(dataState.flares) ? dataState.flares[0] : null;
    if (!latest && !flare) return '';
    const items = [];
    if (latest) items.push(`<div class="solar-metric"><b>${escapeHtml(fluxClass(latest.flux))}</b><span>X-RAY FLUX ${escapeHtml(formatUtc(latest.time_tag))}</span></div>`);
    if (flare) {
      const label = flare.max_class || flare.current_class || 'WATCH';
      items.push(`<div class="solar-metric"><b>${escapeHtml(label)}</b><span>LATEST FLARE STATUS</span></div>`);
    }
    return `<div class="solar-metric-grid">${items.join('')}</div>`;
  }

  function renderDataView(id, view) {
    if (dataState.status === 'loading') {
      return `<h3>${escapeHtml(view.label)} / LOADING</h3><p>Fetching the latest public solar activity packet.</p>`;
    }
    if (dataState.status === 'error') {
      return `<h3>${escapeHtml(view.label)} / UNAVAILABLE</h3><p>${escapeHtml(dataState.error || 'Solar feed did not respond.')}</p>${sourceRow(view)}`;
    }
    if (id === 'xray') return renderXrayView(view);
    if (id === 'flares') return renderFlaresView(view);
    if (id === 'regions') return renderRegionsView(view);
    if (id === 'cmes') return renderCmeView(view);
    return `<h3>${escapeHtml(view.label)}</h3><p>No data renderer available.</p>${sourceRow(view)}`;
  }

  function renderXrayView(view) {
    const latest = latestXrayPoint();
    const sixHour = Array.isArray(dataState.xray) ? dataState.xray.filter(point => point.energy === '0.1-0.8nm') : [];
    const high = sixHour.reduce((max, point) => Math.max(max, Number(point.flux) || 0), 0);
    return `
      <h3>X-RAY FLUX / GOES</h3>
      <p>Current soft X-ray activity from NOAA GOES primary satellite.</p>
      <div class="solar-metric-grid">
        <div class="solar-metric"><b>${escapeHtml(latest ? fluxClass(latest.flux) : '--')}</b><span>CURRENT CLASS</span></div>
        <div class="solar-metric"><b>${escapeHtml(fluxClass(high))}</b><span>6HR PEAK</span></div>
      </div>
      ${latest ? `<div class="solar-card"><strong>${escapeHtml(formatUtc(latest.time_tag))}</strong><p>Flux ${escapeHtml(scientific(latest.flux))} W/m2 / satellite ${escapeHtml(latest.satellite || '--')}</p></div>` : ''}
      ${sourceRow(view)}
    `;
  }

  function renderFlaresView(view) {
    const flares = Array.isArray(dataState.flares) ? dataState.flares.slice(0, 6) : [];
    const cards = flares.map(flare => `
      <div class="solar-card">
        <strong>${escapeHtml(flare.max_class || flare.current_class || 'FLARE WATCH')}</strong>
        <p>Begin ${escapeHtml(formatUtc(flare.begin_time))} / max ${escapeHtml(formatUtc(flare.max_time))} / end ${escapeHtml(formatUtc(flare.end_time))}</p>
        <span>CURRENT ${escapeHtml(flare.current_class || '--')}</span>
      </div>
    `).join('');
    return `
      <h3>RECENT FLARES</h3>
      <p>Latest NOAA GOES flare packet, including class and event timing.</p>
      ${cards || '<div class="solar-card"><strong>NO RECENT FLARE PACKET</strong><p>NOAA did not return a current flare event.</p></div>'}
      ${sourceRow(view)}
    `;
  }

  function renderRegionsView(view) {
    const regions = Array.isArray(dataState.regions) ? dataState.regions.slice() : [];
    regions.sort((a, b) => {
      const riskA = Number(a.x_flare_probability || 0) * 10 + Number(a.m_flare_probability || 0) + Number(a.area || 0) / 1000;
      const riskB = Number(b.x_flare_probability || 0) * 10 + Number(b.m_flare_probability || 0) + Number(b.area || 0) / 1000;
      return riskB - riskA;
    });
    const cards = regions.slice(0, 8).map(region => `
      <div class="solar-card">
        <strong>AR ${escapeHtml(region.region || region.noaa_active_region || '--')} / ${escapeHtml(region.location || '--')}</strong>
        <p>Spots ${escapeHtml(region.number_spots || '--')} / area ${escapeHtml(region.area || '--')} / class ${escapeHtml(region.zurich_class || '--')}</p>
        <span>C ${escapeHtml(region.c_flare_probability || 0)}% / M ${escapeHtml(region.m_flare_probability || 0)}% / X ${escapeHtml(region.x_flare_probability || 0)}%</span>
      </div>
    `).join('');
    return `
      <h3>ACTIVE REGIONS</h3>
      <p>NOAA sunspot and active-region report, sorted by flare potential.</p>
      ${cards || '<div class="solar-card"><strong>NO ACTIVE REGION DATA</strong><p>NOAA did not return region records.</p></div>'}
      ${sourceRow(view)}
    `;
  }

  function renderCmeView(view) {
    const cmes = Array.isArray(dataState.cmes) ? dataState.cmes.slice().reverse().slice(0, 6) : [];
    const cards = cmes.map(cme => {
      const analysis = Array.isArray(cme.cmeAnalyses) ? cme.cmeAnalyses[0] : null;
      const speed = analysis && analysis.speed ? `${Math.round(Number(analysis.speed)).toLocaleString()} km/s` : '--';
      const type = analysis && analysis.type ? analysis.type : 'CME';
      return `
        <div class="solar-card">
          <strong>${escapeHtml(type)} / ${escapeHtml(formatUtc(cme.startTime))}</strong>
          <p>Source ${escapeHtml(cme.sourceLocation || '--')} / speed ${escapeHtml(speed)}</p>
          <span>${escapeHtml(shorten(cme.note || cme.activityID || 'NASA DONKI CME record', 120))}</span>
          ${cme.link ? `<div class="solar-source-row"><a class="solar-source-btn" href="${escapeAttr(cme.link)}" target="_blank" rel="noopener">EVENT</a></div>` : ''}
        </div>
      `;
    }).join('');
    return `
      <h3>CORONAL MASS EJECTIONS</h3>
      <p>Recent NASA DONKI CME records from the last 14 days.</p>
      ${cards || '<div class="solar-card"><strong>NO RECENT CME RECORDS</strong><p>NASA DONKI did not return a CME event in the current window.</p></div>'}
      ${sourceRow(view)}
    `;
  }

  function sourceRow(view) {
    return `
      <div class="solar-source-row">
        <a class="solar-source-btn" href="${escapeAttr(view.sourceUrl)}" target="_blank" rel="noopener">SOURCE</a>
      </div>
    `;
  }

  function ensureSolarData() {
    if (dataPromise || dataState.status === 'loaded') return dataPromise;
    dataState.status = 'loading';
    dataPromise = fetchSolarData()
      .then(next => {
        dataState = { ...dataState, ...next, status: 'loaded', updatedAt: new Date() };
      })
      .catch(error => {
        dataState = { ...dataState, status: 'error', error: error && error.message ? error.message : String(error) };
      })
      .finally(() => {
        dataPromise = null;
        renderActiveOverlay();
      });
    renderActiveOverlay();
    return dataPromise;
  }

  async function fetchSolarData() {
    const feeds = [
      ['xray', 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json'],
      ['flares', 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json'],
      ['regions', 'https://services.swpc.noaa.gov/json/solar_regions.json'],
      ['cmes', donkiCmeUrl()],
    ];
    const results = await Promise.allSettled(feeds.map(([, url]) => fetchJson(url)));
    const next = { xray: [], flares: [], regions: [], cmes: [], error: '' };
    const errors = [];
    results.forEach((result, index) => {
      const [key, url] = feeds[index];
      if (result.status === 'fulfilled') {
        next[key] = result.value;
      } else {
        errors.push(`${key}: ${result.reason && result.reason.message ? result.reason.message : url}`);
      }
    });
    if (errors.length === feeds.length) throw new Error(errors.join(' / '));
    next.error = errors.join(' / ');
    return next;
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`Feed ${response.status}: ${url}`);
      return response.json();
    });
  }

  function donkiCmeUrl() {
    const end = new Date();
    const start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=${dateOnly(start)}&endDate=${dateOnly(end)}`;
  }

  function startRefresh(overlay) {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(() => {
      dataState.status = 'idle';
      ensureSolarData();
      renderSolarOverlay(overlay);
    }, DATA_REFRESH_MS);
  }

  function stopRefresh() {
    if (!refreshTimer) return;
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function renderActiveOverlay() {
    if (!solarActive) return;
    document.querySelectorAll('.solar-overlay:not([hidden])').forEach(renderSolarOverlay);
  }

  function latestXrayPoint() {
    if (!Array.isArray(dataState.xray)) return null;
    const points = dataState.xray.filter(point => point && point.energy === '0.1-0.8nm' && Number.isFinite(Number(point.flux)));
    return points.length ? points[points.length - 1] : null;
  }

  function fluxClass(value) {
    const flux = Number(value);
    if (!Number.isFinite(flux) || flux <= 0) return '--';
    const bands = [
      ['X', 1e-4],
      ['M', 1e-5],
      ['C', 1e-6],
      ['B', 1e-7],
      ['A', 1e-8],
    ];
    for (const [letter, base] of bands) {
      if (flux >= base) return `${letter}${(flux / base).toFixed(1)}`;
    }
    return `A${(flux / 1e-8).toFixed(1)}`;
  }

  function scientific(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toExponential(2) : '--';
  }

  function formatUtc(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z');
  }

  function dateOnly(date) {
    return date.toISOString().slice(0, 10);
  }

  function cacheBust(url) {
    const stamp = Math.floor(Date.now() / IMAGE_REFRESH_MS);
    return `${url}?t=${stamp}`;
  }

  function shorten(value, max) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function patchGlobeEngine() {
    if (!window.GlobeEngine || !window.GlobeEngine.create || window.GlobeEngine.__solarLayerPatched) return;
    const originalCreate = window.GlobeEngine.create.bind(window.GlobeEngine);
    window.GlobeEngine.create = function createSolarAwareEngine(container, theme) {
      const engine = originalCreate(container, theme);
      ensureOverlay(container);

      const originalSetLayerVisible = engine.setLayerVisible ? engine.setLayerVisible.bind(engine) : null;
      engine.setLayerVisible = function setLayerVisible(id, visible) {
        if (id === 'sun') {
          setSolarMode(container, visible);
          return;
        }
        if (originalSetLayerVisible) originalSetLayerVisible(id, visible);
      };

      const originalDispose = engine.dispose ? engine.dispose.bind(engine) : null;
      engine.dispose = function disposeSolarAwareEngine() {
        setSolarMode(container, false);
        if (originalDispose) originalDispose();
      };

      return engine;
    };
    window.GlobeEngine.__solarLayerPatched = true;
  }

  patchGlobeEngine();
  window.GlobalDataSolarLayer = {
    refresh: () => {
      dataState.status = 'idle';
      return ensureSolarData();
    },
    setView: id => {
      currentView = SOLAR_VIEWS[id] ? id : currentView;
      renderActiveOverlay();
    },
  };
})();
