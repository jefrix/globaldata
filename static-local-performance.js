(function () {
  if (window.__globalDataLocalPerformanceInstalled) return;
  window.__globalDataLocalPerformanceInstalled = true;

  const nativeSetInterval = window.setInterval.bind(window);
  const nativeRequestAnimationFrame = window.requestAnimationFrame?.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const MIN_LOCAL_INTERVAL = 1200;
  const MIN_HIDDEN_INTERVAL = 3000;
  const MIN_LOCAL_FRAME_MS = 80;
  const MIN_HIDDEN_FRAME_MS = 1000;

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

  if (nativeRequestAnimationFrame) {
    const lastFrameByCallback = new WeakMap();
    window.requestAnimationFrame = function globalDataRequestAnimationFrame(callback) {
      if (typeof callback !== 'function') return nativeRequestAnimationFrame(callback);

      const wrappedFrame = now => {
        if (!localMode()) return callback(now);

        const minimum = document.hidden ? MIN_HIDDEN_FRAME_MS : MIN_LOCAL_FRAME_MS;
        const lastFrame = lastFrameByCallback.get(callback) || 0;
        if (now - lastFrame >= minimum) {
          lastFrameByCallback.set(callback, now);
          return callback(now);
        }

        return nativeSetTimeout(() => {
          window.requestAnimationFrame(callback);
        }, Math.max(16, minimum - (now - lastFrame)));
      };

      return nativeRequestAnimationFrame(wrappedFrame);
    };
  }
})();
