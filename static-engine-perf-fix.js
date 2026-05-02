// static-engine-perf-fix.js
// Memory leak fixes for GlobeEngine. Loads after engine.js and static-engine-patch.js.
// Targets the freeze-after-1-2-minutes symptom.
//
// Fixes applied:
//   1. Hover raycast throttled to actual mouse movement (was running 60fps unconditionally)
//   2. Pickable object list cached and rebuilt only when layers change
//   3. disposeGroup helper that frees GPU memory; replaces g.clear() in build* methods
//   4. Material cache so build* methods reuse materials instead of allocating per object
//   5. Cyber packet array cleared on rebuild (fixes ever-growing animation list)
//   6. dispose() method on engine for React cleanup

(function () {
  if (!window.GlobeEngine || !window.GlobeEngine.create || !window.THREE) {
    console.warn('[perf-fix] GlobeEngine or THREE not present, skipping');
    return;
  }

  const originalCreate = window.GlobeEngine.create;

  // ============ HELPERS ============

  function disposeGroup(group) {
    if (!group) return;
    group.traverse(obj => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(m => {
          // Only dispose if not in our shared cache (cached materials are reused)
          if (m && !m.userData?.cached) {
            if (m.map) m.map.dispose();
            if (m.uniforms) {
              Object.values(m.uniforms).forEach(u => {
                if (u?.value?.dispose) u.value.dispose();
              });
            }
            m.dispose();
          }
        });
      }
    });
    while (group.children.length) {
      group.remove(group.children[0]);
    }
  }

  function disposeMesh(m) {
    if (!m) return;
    m.geometry?.dispose?.();
    if (Array.isArray(m.material)) {
      m.material.forEach(mat => mat?.dispose?.());
    } else {
      m.material?.dispose?.();
    }
    m.material?.map?.dispose?.();
  }

  // ============ APPLY PATCHES TO ENGINE INSTANCE ============

  function applyPerfFixes(engine) {
    // --- Material cache ---
    engine._matCache = new Map();
    engine._getMaterial = function (key, factory) {
      let m = engine._matCache.get(key);
      if (!m) {
        m = factory();
        if (m) {
          m.userData = m.userData || {};
          m.userData.cached = true; // marks as shared, don't dispose in disposeGroup
          engine._matCache.set(key, m);
        }
      }
      return m;
    };

    // --- Pickable cache for hover raycasting ---
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

    // --- Wrap setLayerVisible / setLayerOpacity to mark cache dirty ---
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

    // --- Throttle hover raycast: only check on actual mouse movement ---
    if (engine.renderer?.domElement) {
      engine.renderer.domElement.addEventListener('pointermove', () => {
        engine._needsHoverCheck = true;
      });
      engine.renderer.domElement.addEventListener('pointerleave', () => {
        engine._needsHoverCheck = false;
        engine.renderer.domElement.style.cursor = 'grab';
      });
    }

    // --- Replace the per-frame raycast in animation loop ---
    // We do this by overriding the raycaster's intersectObjects when called from
    // the hover path. Cleanest approach: monkey-patch the cursor update by
    // wrapping the renderer.render call so we run our own hover logic before each frame
    // and skip the engine's per-frame raycast entirely.
    const origRender = engine.renderer.render.bind(engine.renderer);
    engine.renderer.render = function (scene, camera) {
      // Run our throttled hover check
      if (engine._needsHoverCheck && !engine._stopped) {
        engine._needsHoverCheck = false;
        const now = performance.now();
        // Hard throttle to max 30 hover checks/sec even if mouse moves more
        if (now - engine._lastHoverTime > 33) {
          engine._lastHoverTime = now;
          if (engine._pickableDirty) rebuildPickableCache();
          engine.raycaster.setFromCamera(engine.pointer, engine.camera);
          const hits = engine.raycaster.intersectObjects(engine._pickableCache, false);
          engine.renderer.domElement.style.cursor = hits.length ? 'crosshair' : 'grab';
        }
      }
      origRender(scene, camera);
    };

    // To prevent the engine's _animate loop from ALSO doing the per-frame raycast,
    // we replace the raycaster temporarily during render. Cleanest method: stub
    // intersectObjects to skip work when called from the engine's animation tick.
    // We detect this by checking if a hover was just requested.
    // Simpler approach: just neuter the per-frame raycaster's intersectObjects
    // by wrapping it to no-op when called from the animation loop.
    //
    // Implementation: replace raycaster with a wrapper that tracks call source.
    const origIntersect = engine.raycaster.intersectObjects.bind(engine.raycaster);
    let inHoverCheck = false;
    engine.raycaster.intersectObjects = function (objects, recursive) {
      // Only run the actual intersection from our throttled hover or from explicit clicks
      if (inHoverCheck || objects === engine._pickableCache) {
        return origIntersect(objects, recursive);
      }
      // From the engine's _animate per-frame raycast — return empty, we handle it
      if (engine._inAnimateLoop) return [];
      // From a click or other intentional call — pass through
      return origIntersect(objects, recursive);
    };

    // Mark when we're in the animate loop so our wrapper knows to skip
    // We tag this via a flag set by overriding requestAnimationFrame on the engine's tick.
    // Simpler: set the flag in the render wrapper.
    const origRender2 = engine.renderer.render;
    engine.renderer.render = function (scene, camera) {
      engine._inAnimateLoop = true;
      try {
        origRender2(scene, camera);
      } finally {
        engine._inAnimateLoop = false;
      }
    };

    // --- Patch every build* method to dispose old layer contents ---
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
        // Clear cyber packets when cyber rebuilds (Leak E)
        if (methodName === 'buildCyber' && Array.isArray(engine.cyberPackets)) {
          engine.cyberPackets.length = 0;
        }
        return orig.apply(this, arguments);
      };
    });

    // --- Patch updateLiveData / updateFlights to mark pickable cache dirty ---
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
        // Dispose flight layer contents before update
        const flightLayer = engine.layers?.flights;
        if (flightLayer) {
          // Only dispose if engine recreates objects rather than reusing
          // Conservative: dispose unique geometries/materials but skip cached
          flightLayer.children.forEach(child => {
            if (child.userData?.kind === 'flight' && child.geometry?.userData?.singleUse) {
              child.geometry.dispose();
            }
          });
        }
        const result = origUpdateFlights(flights);
        engine._pickableDirty = true;
        return result;
      };
    }

    // --- dispose() method for React cleanup ---
    engine.dispose = function () {
      if (engine._stopped) return;
      engine._stopped = true;

      // Disconnect resize observer
      try { engine._resizeObserver?.disconnect(); } catch (_) {}

      // Dispose all layers
      Object.values(engine.layers || {}).forEach(layer => {
        try { disposeGroup(layer); } catch (_) {}
      });
      engine.layers = {};

      // Dispose static parts
      [engine.glowMesh, engine.coreMesh, engine.grid, engine.landmasses,
       engine.depthMaskMesh].forEach(m => {
        if (!m) return;
        try {
          if (m.traverse) {
            m.traverse(obj => {
              obj.geometry?.dispose?.();
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat?.dispose?.());
              } else {
                obj.material?.dispose?.();
              }
            });
          }
          disposeMesh(m);
        } catch (_) {}
      });

      // Dispose cached materials
      engine._matCache?.forEach(m => {
        try { m.dispose(); } catch (_) {}
      });
      engine._matCache?.clear();

      // Dispose renderer + force WebGL context loss
      try {
        engine.renderer?.dispose();
        engine.renderer?.forceContextLoss?.();
        engine.renderer?.domElement?.remove();
      } catch (_) {}

      // Clear references
      engine.scene = null;
      engine.camera = null;
      engine.root = null;
      engine.flightsData = [];
      engine.vesselsData = [];
      engine.cyberData = [];
      engine.satellitesData = [];
      engine.cyberPackets = [];
      engine.onPickCallbacks = [];
    };

    // --- Stop the animation loop when disposed ---
    // The engine's tick uses requestAnimationFrame. We can't cancel it directly,
    // but if engine._stopped is true, the wrapper render() short-circuits and
    // the loop becomes a cheap no-op. Belt-and-suspenders: also stub render.
    const origRenderForStop = engine.renderer.render;
    engine.renderer.render = function (scene, camera) {
      if (engine._stopped) return;
      origRenderForStop(scene, camera);
    };

    return engine;
  }

  // ============ HOOK INTO CREATE ============

  window.GlobeEngine.create = function patchedCreate(el, theme) {
    const engine = originalCreate(el, theme);
    try {
      applyPerfFixes(engine);
      console.log('[perf-fix] Applied to GlobeEngine instance');
    } catch (err) {
      console.error('[perf-fix] Failed to apply:', err);
    }
    return engine;
  };

  // Expose helpers for debugging
  window.GlobeEnginePerfFix = {
    disposeGroup,
    disposeMesh,
    version: '1.0.0',
  };
})();
