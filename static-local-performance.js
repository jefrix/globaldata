(function () {
  if (window.__globalDataLocalPerformanceInstalled) return;
  window.__globalDataLocalPerformanceInstalled = true;

  const nativeSetInterval = window.setInterval.bind(window);
  const MIN_LOCAL_INTERVAL = 1200;
  const MIN_HIDDEN_INTERVAL = 3000;

  function localMode() {
    return Boolean(document.querySelector('.globe-wrap.local-map-mode'));
  }

  window.setInterval = function globalDataSetInterval(callback, delay, ...args) {
    const numericDelay = Number(delay) || 0;
    if (typeof callback !== 'function' || numericDelay > 500) {
      return nativeSetInterval(callback, delay, ...args);
    }

    let lastRun = 0;
    return nativeSetInterval(function throttledInterval(...tickArgs) {
      if (localMode()) {
        const now = performance.now();
        const minimum = document.hidden ? MIN_HIDDEN_INTERVAL : MIN_LOCAL_INTERVAL;
        if (now - lastRun < minimum) return;
        lastRun = now;
      }
      return callback.apply(this, tickArgs);
    }, delay, ...args);
  };
})();
