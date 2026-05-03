// static-engine-perf-fix.js v2
// Memory leak fixes for GlobeEngine.

(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) {
    console.warn('[perf-fix] GlobeEngine or THREE not present, skipping');
    return;
  }

  const originalCreate = window.GlobeEngine.create;

  function disposeGroup(group) {
    if (!group) return;
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (m && !m.userData?.cached) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        });
      }
    });
    while (group.children.length) group.remove(group.children[0]);
  }

  function disposeMesh(m) {
    if (!m) return;
    m.geometry?.dispose?.();
    if (Array.isArray(m.material)) m.material.forEach(mat => mat?.dispose?.());
    else m.material?.dispose?.();
    m.material?.map?.dispose?.();
  }

  function applyPerfFixes(engine) {
    // Pickable cache for hover raycasting
    engine._pickableCache = [];
    engine._pickableDirty = true;
    engine._needsHoverCheck = false;
    engine._lastHoverTime = 0;

    const rebuildPickableCache = () => {
      engine._pickableCache.length = 0;
      Object.values(engine.layers || {}).forEach(layer => {
        if (layer && layer.visible) {
          layer.traverse(o => {
            if (o.userData && o.userData.kind) engine._pickableCache.push(o);
          });
        }
      });
      engine._pickableDirty = false;
    };

    // Mark cache dirty when layers change
    const origSetLayerVisible = engine.setLayerVisible?.bind(engine);
    if (origSetLayerVisible) {
      engine.setLayerVisible = function (name, visible) {
        origSetLayerVisible(name, visible);
        engine._pickableDirty = true;
      };
    }

    const origSetLayerOpacity = engine.setLayerOpacity?.bind(engine);
    if (origSetLayerOpacity) {
      engine.setLayerOpacity = function (name, op) {
        origSetLayerOpacity(name, op);
        engine._pickableDirty = true;
      };
    }

    // Track mouse movement
    if (engine.renderer?.domElement) {
      engine.renderer.domElement.addEventListener('pointermove', () => {
        engine._needsHoverCheck = true;
      });
    }

    // ONE wrapper around render — handles hover throttling AND stop-on-dispose
    const origRender = engine.renderer.render.bind(engine.renderer);
    engine.renderer.render = function (scene, camera) {
      if (engine._stopped) return;
      
      // Throttled hover check — only runs on actual mouse movement, max 30/sec
      if (engine._needsHoverCheck) {
        const now = performance.now();
        if (now - engine._lastHoverTime > 33) {
          engine._needsHoverCheck = false;
          engine._lastHoverTime = now;
          if (engine._pickableDirty) rebuildPickableCache();
          engine.raycaster.setFromCamera(engine.pointer, engine.camera);
          const hits = engine.raycaster.intersectObjects(engine._pickableCache, false);
          engine.renderer.domElement.style.cursor = hits.length ? 'crosshair' : 'grab';
        }
      }
      
      origRender(scene, camera);
    };

    // Patch build* methods to dispose old layer contents before rebuild
    const buildMethods = [
      'buildGeologic', 'buildGeographic', 'buildClimate', 'buildNews',
      'buildLogistics', 'buildFlights', 'buildCyber', 'buildSatellites',
      'buildConflicts', 'buildMilitary', 'buildDiplomacy',
    ];
    buildMethods.forEach(methodName => {
      const orig = engine[methodName];
      if (typeof orig !== 'function') return;
      engine[methodName] = function () {
        const layerName = methodName.replace('build', '').toLowerCase();
        const layer = engine.layers?.[layerName];
        if (layer) disposeGroup(layer);
        if (methodName === 'buildCyber' && Array.isArray(engine.cyberPackets)) {
          engine.cyberPackets.length = 0;
        }
        return orig.apply(this, arguments);
      };
    });

    // Mark dirty on data updates
    const origUpdateLive = engine.updateLiveData?.bind(engine);
    if (origUpdateLive) {
      engine.updateLiveData = function (data) {
        const result = origUpdateLive(data);
        engine._pickableDirty = true;
        return result;
      };
    }

    const origUpdateFlights = engine.updateFlights?.bind(engine);
    if (origUpdateFlights) {
      engine.updateFlights = function (flights) {
        const result = origUpdateFlights(flights);
        engine._pickableDirty = true;
        return result;
      };
    }

    // dispose() for React cleanup
    engine.dispose = function () {
      if (engine._stopped) return;
      engine._stopped = true;

      try { engine._resizeObserver?.disconnect(); } catch (_) {}

      Object.values(engine.layers || {}).forEach(layer => {
        try { disposeGroup(layer); } catch (_) {}
      });
      engine.layers = {};

      [engine.glowMesh, engine.coreMesh, engine.grid, engine.landmasses,
       engine.depthMaskMesh].forEach(m => {
        if (!m) return;
        try {
          if (m.traverse) {
            m.traverse(obj => {
              obj.geometry?.dispose?.();
              if (Array.isArray(obj.material)) obj.material.forEach(mat => mat?.dispose?.());
              else obj.material?.dispose?.();
            });
          }
          disposeMesh(m);
        } catch (_) {}
      });

      try {
        engine.renderer?.dispose();
        engine.renderer?.forceContextLoss?.();
        engine.renderer?.domElement?.remove();
      } catch (_) {}

      engine.flightsData = [];
      engine.vesselsData = [];
      engine.cyberData = [];
      engine.satellitesData = [];
      engine.cyberPackets = [];
      engine.onPickCallbacks = [];
    };

    return engine;
  }

  window.GlobeEngine.create = function patchedCreate(el, theme) {
    const engine = originalCreate(el, theme);
    try {
      applyPerfFixes(engine);
      console.log('[perf-fix v2] Applied to GlobeEngine instance');
    } catch (err) {
      console.error('[perf-fix v2] Failed to apply:', err);
    }
    return engine;
  };

  window.GlobeEnginePerfFix = { disposeGroup, disposeMesh, version: '2.0.0' };
})();
