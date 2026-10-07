(function () {
  const PAN_LIMIT_FACTOR = 0.52;
  let panX = 0;
  let panY = 0;
  let panStart = null;
  let suppressNextClick = false;
  let wiredStage = null;
  let originalSetZoom = null;

  function ensureStyles() {
    if (document.querySelector('[data-field-mode-style]')) return;
    const style = document.createElement('style');
    style.dataset.fieldModeStyle = '1';
    style.textContent = `
      .local-map-stage {
        touch-action: none;
        cursor: grab;
      }
      .local-map-stage.is-panning {
        cursor: grabbing;
      }
      .local-map-svg {
        will-change: transform, translate;
      }
      .layer-head[role="button"] { cursor: pointer; }

      @media (max-width: 1200px) {
        .main { grid-template-columns: 238px minmax(0, 1fr) 278px; }
        .tb-right { gap: 7px; }
        .logo-t { font-size: 11px; }
        .logo-st { font-size: 7px; }
        .layer-row { padding: 9px 10px; }
        .feed-item { padding: 8px 10px; }
      }

      @media (max-width: 900px), (orientation: portrait) and (max-width: 1100px) {
        html, body, #root, .app { min-height: 100dvh; }
        body { overflow: hidden; }
        .app { grid-template-rows: auto minmax(0, 1fr) auto; }
        .top-bar {
          min-height: 42px;
          height: auto;
          padding: 5px 8px;
          gap: 8px;
        }
        .tb-left { flex: 1 1 auto; min-width: 0; }
        .tb-center, .dtg, .op-badge { display: none; }
        .tb-right { flex: 0 0 auto; gap: 5px; }
        .logo { gap: 7px; min-width: 0; }
        .logo svg { width: 23px; height: 23px; }
        .logo-t { font-size: 9.5px; line-height: 1.1; }
        .logo-st, .repo-links { display: none; }
        .top-links { flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .top-links a {
          height: auto;
          min-height: 32px;
          padding: 6px 8px;
          font-size: 9px;
          letter-spacing: 0.08em;
        }
        .iconbtn {
          min-width: 44px;
          min-height: 36px;
          padding: 0 7px;
          font-size: 0;
        }
        .iconbtn svg { margin: 0; }
        .main {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          grid-template-rows: minmax(0, 1fr) minmax(220px, 40vh);
          gap: 1px;
        }
        .globe-wrap {
          grid-column: 1 / 3;
          grid-row: 1;
          min-height: 0;
        }
        .rail-left {
          grid-column: 1;
          grid-row: 2;
          min-height: 0;
        }
        .rail-right {
          grid-column: 2;
          grid-row: 2;
          min-height: 0;
        }
        .rail-hd { padding: 7px 10px; font-size: 9px; }
        .layers { padding: 3px 0; -webkit-overflow-scrolling: touch; touch-action: pan-y; }
        .layer-row { padding: 7px 18px 7px 9px; }
        .layer-head { gap: 7px; touch-action: manipulation; }
        .layer-idx { width: 17px; height: 17px; font-size: 9px; }
        .layer-label { font-size: 9px; }
        .layer-sub { font-size: 7.2px; line-height: 1.25; }
        .layer-slider { margin-top: 5px; padding-left: 0; gap: 5px; }
        .rail-ft { display: block; padding: 8px 10px; }
        .inspector { max-height: 50%; }
        .insp-hd, .feed-head { padding: 7px 10px; }
        .insp-body { padding: 8px 10px; }
        .feed-item { padding: 7px 10px; gap: 7px; }
        .feed-title {
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .bottom-bar {
          height: auto;
          min-height: 24px;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          gap: 10px;
          padding: 3px 8px;
        }
        .bottom-bar .stat { flex: 0 0 auto; }
        .local-map-overlay {
          padding: 10px;
          gap: 7px;
        }
        .local-map-top, .local-map-foot {
          gap: 8px;
          letter-spacing: 0.12em;
        }
        .local-map-title { font-size: 10px; }
        .local-map-status, .local-map-foot { font-size: 8px; }
        .local-zoom-controls { right: 8px; }
        .local-zoom-controls button {
          width: 32px;
          height: 32px;
          font-size: 16px;
        }
        .local-zoom-label { font-size: 7px; }

        .phone-globe-toggle { display: inline-flex; align-items: center; justify-content: center; }
        body.phone-globe-full .main {
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: minmax(0, 1fr) !important;
        }
        body.phone-globe-full .globe-wrap {
          grid-column: 1 / -1 !important;
          grid-row: 1 !important;
        }
        body.phone-globe-full .rail-left,
        body.phone-globe-full .rail-right,
        body.phone-globe-full .bottom-bar { display: none !important; }
      }

      @media (max-width: 620px) {
        .top-bar { min-height: 38px; }
        .tb-right .iconbtn:nth-of-type(2) { display: none; }
        .main {
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: minmax(180px, 1fr) minmax(240px, 42vh) minmax(132px, 24vh);
        }
        .globe-wrap { grid-column: 1; grid-row: 1; }
        .rail-left { grid-column: 1; grid-row: 2; }
        .rail-right { grid-column: 1; grid-row: 3; }
        .layer-row { padding-right: 28px; }
        .rail-ft { display: block; }
        .inspector { max-height: 46%; }
        .xh, .bearing { display: none; }
        .local-map-overlay { padding: 8px; }
        .local-map-foot { display: none; }
      }


      .phone-globe-toggle {
        display: none;
        position: fixed;
        right: 12px;
        bottom: 40px;
        z-index: 40;
        min-width: 92px;
        min-height: 44px;
        padding: 0 14px;
        border: 1px solid var(--accent, #3b8df5);
        background: rgba(5, 11, 23, 0.88);
        color: var(--accent, #3b8df5);
        font-family: var(--mono, ui-monospace, monospace);
        font-size: 11px;
        letter-spacing: 0.14em;
        cursor: pointer;
        touch-action: manipulation;
      }
      body.phone-globe-full .phone-globe-toggle { bottom: 16px; }

      @media (pointer: coarse) {
        button, .feed-item, .layer-row { min-height: 44px; }
        .layer-head > button { margin-right: 8px; }
        .opSlider::-webkit-slider-thumb { width: 22px; height: 22px; }
        .opSlider::-moz-range-thumb { width: 22px; height: 22px; }
        .top-links a { min-height: 36px; }
        .local-county, .local-road, .local-lake, .local-water-line,
        .local-park-zone, .local-city-dot, .local-power-line { touch-action: manipulation; }
      }
    `;
    document.head.appendChild(style);
  }

  function localMode() {
    return Boolean(document.querySelector('.globe-wrap.local-map-mode'));
  }

  function zoomLevel() {
    return window.GlobalDataLocalLayer?.getZoom?.() || 1;
  }

  function stageEl() {
    return document.querySelector('[data-local-map-overlay] .local-map-stage');
  }

  function svgEl() {
    return document.querySelector('[data-local-map-overlay] [data-local-map-svg]');
  }

  function clampPan() {
    const stage = stageEl();
    const zoom = zoomLevel();
    if (!stage || zoom <= 1) {
      panX = 0;
      panY = 0;
      return;
    }
    const maxX = Math.max(0, stage.clientWidth * (zoom - 1) * PAN_LIMIT_FACTOR);
    const maxY = Math.max(0, stage.clientHeight * (zoom - 1) * PAN_LIMIT_FACTOR);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function applyPan() {
    clampPan();
    const svg = svgEl();
    if (!svg) return;
    svg.style.translate = `${panX.toFixed(1)}px ${panY.toFixed(1)}px`;
  }

  function panBy(dx, dy) {
    if (zoomLevel() <= 1) return;
    panX += dx;
    panY += dy;
    applyPan();
  }

  function resetFieldView() {
    panX = 0;
    panY = 0;
    if (window.GlobalDataLocalLayer?.setZoom) window.GlobalDataLocalLayer.setZoom(1);
    applyPan();
  }

  function extendLocalApi() {
    const api = window.GlobalDataLocalLayer;
    if (!api || api.__fieldModeExtended) return;
    originalSetZoom = api.setZoom?.bind(api);
    if (originalSetZoom) {
      api.setZoom = value => {
        originalSetZoom(value);
        applyPan();
      };
    }
    api.panBy = panBy;
    api.resetView = resetFieldView;
    api.getPan = () => ({ x: panX, y: panY });
    api.__fieldModeExtended = true;
  }

  function wireStage() {
    const stage = stageEl();
    if (!stage || stage === wiredStage) return;
    wiredStage = stage;
    stage.addEventListener('pointerdown', event => {
      if (!localMode()) return;
      if (event.target.closest?.('[data-local-zoom-controls]')) return;
      panStart = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        panX,
        panY,
        moved: false,
      };
      stage.classList.add('is-panning');
      stage.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      if (!panStart || panStart.id !== event.pointerId) return;
      const dx = event.clientX - panStart.x;
      const dy = event.clientY - panStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) panStart.moved = true;
      panX = panStart.panX + dx;
      panY = panStart.panY + dy;
      applyPan();
      if (panStart.moved) event.preventDefault();
    }, { passive: false });
    const finishPan = event => {
      if (!panStart || panStart.id !== event.pointerId) return;
      if (panStart.moved) {
        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 0);
      }
      panStart = null;
      stage.classList.remove('is-panning');
      stage.releasePointerCapture?.(event.pointerId);
    };
    stage.addEventListener('pointerup', finishPan);
    stage.addEventListener('pointercancel', finishPan);
    stage.addEventListener('click', event => {
      if (!suppressNextClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
    }, true);
  }

  window.addEventListener('keydown', event => {
    if (!localMode()) return;
    if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '0'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const step = 44;
    if (event.key === '0') resetFieldView();
    if (event.key === 'ArrowUp') panBy(0, step);
    if (event.key === 'ArrowDown') panBy(0, -step);
    if (event.key === 'ArrowLeft') panBy(step, 0);
    if (event.key === 'ArrowRight') panBy(-step, 0);
  }, true);


  function syncGlobeToggle() {
    let button = document.querySelector('[data-phone-globe-toggle]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'phone-globe-toggle';
      button.dataset.phoneGlobeToggle = '1';
      button.addEventListener('click', () => {
        document.body.classList.toggle('phone-globe-full');
        syncGlobeToggle();
        const kick = () => window.dispatchEvent(new Event('resize'));
        kick();
        setTimeout(kick, 60);
      });
      document.body.appendChild(button);
    }
    const full = document.body.classList.contains('phone-globe-full');
    button.textContent = full ? 'MENU' : 'FULL GLOBE';
    button.setAttribute('aria-pressed', String(full));
    button.title = full ? 'Show the layer menu' : 'Expand the globe';
  }

  window.addEventListener('resize', applyPan);
  ensureStyles();
  syncGlobeToggle();
  setInterval(() => {
    extendLocalApi();
    wireStage();
    applyPan();
    syncGlobeToggle();
  }, 350);
})();
