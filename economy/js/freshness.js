/**
 * Check the published economy/data/latest.json snapshot.
 * This does not call Yahoo, FRED, Treasury, BLS, or the NY Fed.
 * Those pulls happen in scripts/fetch-economy-data.mjs.
 */
(function (root) {
  "use strict";

  var TIMEOUT_MS = 8000;
  var DEDUPE_MS = 2000;
  var inflight = null;
  var lastStarted = 0;
  var lastResult = null;
  var current = null;
  var onData = null;

  function snapshotTime(data) {
    var t = Date.parse((data && data.fetchedAt) || "");
    return isFinite(t) ? t : 0;
  }

  function decideSnapshot(currentData, incoming) {
    if (!incoming || !Array.isArray(incoming.series) || incoming.series.length === 0) {
      return { apply: false, reason: "empty" };
    }
    if (!currentData || !Array.isArray(currentData.series) || currentData.series.length === 0) {
      return { apply: true, reason: "initial", incomingFetchedAt: incoming.fetchedAt || null };
    }
    var next = snapshotTime(incoming);
    var prev = snapshotTime(currentData);
    if (!(next > prev)) {
      return { apply: false, reason: "not-newer", incomingFetchedAt: incoming.fetchedAt || null };
    }
    return { apply: true, reason: "newer", incomingFetchedAt: incoming.fetchedAt };
  }

  function describeFreshness(data, nowMs) {
    var fetched = data && data.fetchedAt;
    var parsed = Date.parse(fetched || "");
    var ageH = isFinite(parsed) ? (nowMs - parsed) / 36e5 : Infinity;
    var state = (data && data.clientCheck && data.clientCheck.state) || "embedded";
    var badge = "PUBLISHED SNAPSHOT";
    var klass = "is-live";
    if (state === "offline") {
      badge = "OFFLINE";
      klass = "is-dead";
    } else if (state === "timeout") {
      badge = "CHECK TIMEOUT";
      klass = "is-stale";
    } else if (state === "checking") {
      badge = "CHECKING";
      klass = "is-stale";
    } else if (!isFinite(ageH) || ageH >= 36) {
      badge = "STALE SNAPSHOT";
      klass = "is-dead";
    }
    var held = 0;
    var series = (data && data.series) || [];
    for (var i = 0; i < series.length; i++) if (series[i] && series[i].retained) held += 1;
    var lines = {
      updated: "NEWER SNAPSHOT APPLIED",
      current: "SNAPSHOT CURRENT",
      offline: "KEPT EMBEDDED COPY",
      timeout: "CHECK TIMED OUT",
      checking: "CHECKING PUBLISHED JSON",
      embedded: "PUBLISHED JSON",
    };
    var line = lines[state] || "PUBLISHED JSON";
    if (held) line += " · " + held + " LAST-KNOWN";
    return { badge: badge, klass: klass, line: line, ageH: ageH, held: held };
  }

  function trustedParentMessage(event, env) {
    env = env || {};
    var parentRef = env.parent != null ? env.parent : root.parent;
    var selfRef = env.self != null ? env.self : root;
    var origin = env.origin != null ? env.origin : (root.location && root.location.origin);
    if (!event || event.source !== parentRef) return false;
    if (parentRef === selfRef) return false;
    var data = event.data;
    if (!data || data.type !== "ecr-check-freshness" || data.v !== 1) return false;
    if (origin && origin !== "null") return event.origin === origin;
    return event.origin === "null" || event.origin === "";
  }

  function paintStatus(data) {
    var el = root.document && root.document.getElementById("ecr-freshness");
    if (!el) return;
    var described = describeFreshness(data, Date.now());
    el.textContent = described.line;
    el.className = "ecr-freshness " + described.klass;
  }

  function checkPublishedSnapshot(currentData, deps) {
    deps = deps || {};
    var fetchFn = deps.fetch || root.fetch;
    var base = deps.baseURI || (root.document && root.document.baseURI) || "";
    var timeoutMs = deps.timeoutMs || TIMEOUT_MS;
    if (inflight) return inflight;
    var run = (async function () {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs);
      try {
        var url = new URL("data/latest.json", base || undefined);
        url.searchParams.set("t", String(Date.now()));
        var res = await fetchFn(url.href, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined });
        if (!res || !res.ok) {
          return { state: "offline", data: currentData, error: "HTTP " + (res && res.status) };
        }
        var json = await res.json();
        var decision = decideSnapshot(currentData, json);
        if (decision.apply) return { state: "updated", data: json, decision: decision };
        return { state: "current", data: currentData, decision: decision };
      } catch (err) {
        var name = err && err.name;
        var state = name === "AbortError" ? "timeout" : "offline";
        return { state: state, data: currentData, error: String((err && err.message) || err) };
      } finally {
        clearTimeout(timer);
      }
    })();
    inflight = run;
    run.finally(function () {
      if (inflight === run) inflight = null;
    });
    return run;
  }

  function requestCheck(options) {
    options = options || {};
    var now = Date.now();
    if (inflight) return inflight;
    if (!options.force && lastResult && now - lastStarted < DEDUPE_MS) return Promise.resolve(lastResult);
    lastStarted = now;
    if (current) {
      current = Object.assign({}, current, { clientCheck: { state: "checking" } });
      paintStatus(current);
    }
    var pending = checkPublishedSnapshot(current, options).then(function (result) {
      var next = result.data || current;
      if (next) {
        next = Object.assign({}, next, { clientCheck: { state: result.state, checkedAt: new Date().toISOString() } });
      }
      if (result.state === "updated" && next) {
        current = next;
        if (onData) onData(current);
      } else if (next) {
        current = next;
        if (onData && result.state !== "updated") onData(current);
      }
      lastResult = { state: result.state, data: current, error: result.error || null, decision: result.decision || null };
      paintStatus(current);
      return lastResult;
    });
    return pending;
  }

  function init(data, paint) {
    current = data || null;
    onData = paint || null;
    if (current) paintStatus(Object.assign({}, current, { clientCheck: { state: "embedded" } }));
    if (root.addEventListener) {
      root.addEventListener("message", function (event) {
        if (!trustedParentMessage(event)) return;
        requestCheck();
      });
    }
  }

  root.ECRFreshness = {
    TIMEOUT_MS: TIMEOUT_MS,
    DEDUPE_MS: DEDUPE_MS,
    snapshotTime: snapshotTime,
    decideSnapshot: decideSnapshot,
    describeFreshness: describeFreshness,
    trustedParentMessage: trustedParentMessage,
    checkPublishedSnapshot: checkPublishedSnapshot,
    requestCheck: requestCheck,
    init: init,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
