(function () {
  if (window.location.hostname !== 'jefrix.github.io') return;
  if (!window.GlobeEngine || !window.GlobeEngine.create) return;

  const originalCreate = window.GlobeEngine.create;

  window.GlobeEngine.create = function patchedCreate(el, theme) {
    const engine = originalCreate(el, theme);
    const originalUpdateLiveData = engine.updateLiveData?.bind(engine);
    const originalUpdateFlights = engine.updateFlights?.bind(engine);

    if (originalUpdateLiveData) {
      engine.updateLiveData = function patchedUpdateLiveData(data) {
        originalUpdateLiveData(data);
        if (!data?.shippingLanes?.length || !engine._addLine || !engine.layerGroups?.logistics) return;
        data.shippingLanes.slice(0, 260).forEach(lane => {
          engine._addLine('logistics', lane.pts || lane, engine.theme.lane || '#7bd6a8', 0.28);
        });
      };
    }

    if (originalUpdateFlights) {
      engine.updateFlights = function patchedUpdateFlights(flights) {
        originalUpdateFlights(flights);
        (engine.flightObjects || []).forEach(flight => {
          if (flight.data?.live || flight.data?.source === 'airplanes.live') {
            flight.velocity = Number(flight.velocity || 0) * 0.096;
          }
        });
      };
    }

    return engine;
  };
})();
