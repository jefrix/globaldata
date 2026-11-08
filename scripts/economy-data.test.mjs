import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import {
  alignSpreadExact,
  buildSpread2s10s,
  crossCheckSpread,
  decideSnapshot,
  describeFreshness,
  mergeOrder,
  monthlyAverage,
  parseLatestJs,
  parseTreasuryYieldCsv,
  retainMissing,
  shouldWriteSnapshot,
  validateSnapshot,
  yieldUnitScale,
  yoyFromLevelsExact,
} from "./economy-data-lib.mjs";

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failed += 1;
    console.error("FAIL " + name);
    console.error(err);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log("ok  " + name);
  } catch (err) {
    failed += 1;
    console.error("FAIL " + name);
    console.error(err);
  }
}

test("yield scale keeps percent and converts only the legacy 10x quote", () => {
  assert.equal(yieldUnitScale([4.2, 4.5, 4.9]).scale, 1);
  assert.equal(yieldUnitScale([42, 45, 49]).scale, 0.1);
  assert.equal(yieldUnitScale([400, 500]).scale, null);
  assert.equal(yieldUnitScale([]).scale, null);
});

test("2s10s aligns on the exact date and ignores same-month mismatches", () => {
  const ten = [
    { date: "2026-11-01", value: 5 },
    { date: "2026-11-06", value: 4.86 },
    { date: "2026-11-20", value: 4.5 },
  ];
  const two = [
    { date: "2026-11-03", value: 3 },
    { date: "2026-11-06", value: 4.51 },
  ];
  const aligned = alignSpreadExact(ten, two);
  assert.equal(aligned.length, 1);
  assert.equal(aligned[0].date, "2026-11-06");
  assert.equal(Math.round((aligned[0].value) * 1000) / 1000, 0.35);
  const built = buildSpread2s10s({
    ten,
    two,
    tenSource: "treasury",
    twoSource: "treasury",
    note: "Treasury 10Y−2Y, same date",
  });
  assert.equal(built.row.value, 0.35);
  assert.equal(built.row.asOf, "2026-11-06");
  assert.equal(built.row.audit.date, "2026-11-06");
  assert.equal(built.row.audit.ten, 4.86);
  assert.equal(built.row.audit.two, 4.51);
  assert.ok(built.row.history.length >= 1);
  assert.equal(built.row.history[built.row.history.length - 1], 0.35);
});

test("2s10s is not computed from mismatched dates", () => {
  const built = buildSpread2s10s({
    ten: [{ date: "2026-11-07", value: 4.2 }],
    two: [{ date: "2026-11-06", value: 4.0 }],
  });
  assert.equal(built.row, null);
});

test("official T10Y2Y replaces a diverging level spread", () => {
  const ten = [];
  const two = [];
  for (let i = 0; i < 6; i++) {
    const date = "2026-10-" + String(i + 1).padStart(2, "0");
    ten.push({ date, value: 5 });
    two.push({ date, value: 4 });
  }
  const official = ten.map((o) => ({ date: o.date, value: 0.2 }));
  const check = crossCheckSpread(alignSpreadExact(ten, two), official, 0.02);
  assert.ok(check.maxAbs > 0.05);
  const built = buildSpread2s10s({ ten, two, official });
  assert.equal(built.row.value, 0.2);
  assert.match(built.row.asOfNote, /T10Y2Y/);
});

test("treasury parser uses headers, not column positions", () => {
  const text = [
    'Date,"1 Mo","2 Yr","10 Yr"',
    "11/06/2026,4.02,4.51,4.86",
    "11/05/2026,4.03,4.46,4.84",
  ].join("\n");
  const parsed = parseTreasuryYieldCsv(text);
  assert.equal(parsed.rows[0].date, "2026-11-05");
  assert.equal(parsed.rows[1]["2 yr"], 4.51);
  assert.equal(parsed.rows[1]["10 yr"], 4.86);
});

test("CPI YoY uses the same calendar month a year earlier", () => {
  const yoy = yoyFromLevelsExact([
    { date: "2025-09-01", value: 324.245 },
    { date: "2026-08-01", value: 334.131 },
    { date: "2026-09-01", value: 336.298 },
  ]);
  const sep = yoy.find((o) => o.date === "2026-09-01");
  assert.ok(Math.abs(sep.value - 3.7173) < 0.001);
  assert.equal(yoy.some((o) => o.date === "2026-08-01"), false);
});

test("EFFR monthly average drops an incomplete month and reproduces September 2026", () => {
  const daily = [];
  for (let i = 0; i < 21; i++) daily.push({ date: "2026-09-" + String(i + 1).padStart(2, "0"), value: i === 0 ? 3.63 : 3.755 });
  daily[0].value = 3.63;
  // Construct values whose mean is 3.749.
  const sept = [];
  for (let i = 0; i < 20; i++) sept.push({ date: "2026-09-" + String(i + 1).padStart(2, "0"), value: 3.75 });
  sept.push({ date: "2026-09-21", value: 3.729 });
  for (let i = 0; i < 4; i++) sept.push({ date: "2026-11-0" + (i + 2), value: 3.88 });
  const monthly = monthlyAverage(sept, 15);
  assert.equal(monthly.length, 1);
  assert.equal(monthly[0].date, "2026-09-01");
  assert.ok(Math.abs(monthly[0].value - 3.749) < 0.001);
});

test("failed series keep the dated last print, or are marked unavailable", () => {
  const previous = [{ id: "hy_oas", value: 3.1, asOf: "2026-10-30", available: true, source: "fred", history: [3] }];
  const kept = retainMissing([], previous, [{ id: "hy_oas", source: "fred", error: "timeout" }]);
  assert.equal(kept[0].value, 3.1);
  assert.equal(kept[0].asOf, "2026-10-30");
  assert.equal(kept[0].retained, true);
  assert.equal(kept[0].fetchStatus, "last-known");
  const missing = retainMissing([], [], [{ id: "nope", source: "fred", error: "down" }]);
  assert.equal(missing[0].available, false);
  assert.equal(missing[0].value, null);
  assert.equal(missing[0].fetchStatus, "unavailable");
});

test("a thin fetch does not qualify as a new snapshot", () => {
  assert.equal(shouldWriteSnapshot([
    { id: "spx", source: "yahoo", value: 1 },
    { id: "gold", source: "yahoo", value: 1 },
  ]), false);
  assert.equal(shouldWriteSnapshot([
    { id: "spx", source: "yahoo", value: 1 },
    { id: "gold", source: "yahoo", value: 1 },
    { id: "wti", source: "yahoo", value: 1 },
    { id: "unrate", source: "bls", value: 4.1 },
    { id: "cpi", source: "bls", value: 3.7 },
    { id: "twoy", source: "treasury", value: 4.5 },
  ]), true);
  const retained = [
    { id: "spx", source: "yahoo", value: 1, retained: true },
    { id: "gold", source: "yahoo", value: 1, retained: true },
    { id: "wti", source: "yahoo", value: 1, retained: true },
    { id: "unrate", source: "bls", value: 4.1, retained: true },
    { id: "cpi", source: "bls", value: 3.7, retained: true },
    { id: "twoy", source: "treasury", value: 4.5, retained: true },
  ];
  assert.equal(shouldWriteSnapshot(retained), false);
});

test("merge keeps the previous tile order", () => {
  const ordered = mergeOrder(
    [{ id: "gold" }, { id: "spx" }],
    [{ id: "spx", value: 2 }, { id: "gold", value: 1 }, { id: "new", value: 3 }]
  );
  assert.deepEqual(ordered.map((s) => s.id), ["gold", "spx", "new"]);
});

test("freshness decisions do not reload older or empty payloads", () => {
  const current = { fetchedAt: "2026-11-08T00:00:00.000Z", series: [{ id: "spx", value: 1 }] };
  assert.equal(decideSnapshot(current, { fetchedAt: "2026-11-01T00:00:00.000Z", series: [{ id: "spx", value: 9 }] }).apply, false);
  assert.equal(decideSnapshot(current, { fetchedAt: "2026-11-08T00:00:00.000Z", series: [{ id: "spx", value: 1 }] }).apply, false);
  assert.equal(decideSnapshot(current, { fetchedAt: "2026-11-09T00:00:00.000Z", series: [{ id: "spx", value: 2 }] }).apply, true);
  assert.equal(decideSnapshot(null, { fetchedAt: "2026-11-09T00:00:00.000Z", series: [{ id: "spx", value: 2 }] }).apply, true);
  assert.equal(decideSnapshot(current, { fetchedAt: "2026-11-09T00:00:00.000Z", series: [] }).apply, false);
});

test("freshness copy names a snapshot, including offline and timeout", () => {
  const data = { fetchedAt: new Date().toISOString(), series: [], clientCheck: { state: "current" } };
  const described = describeFreshness(data, Date.now());
  assert.equal(described.badge, "PUBLISHED SNAPSHOT");
  assert.equal(described.line, "SNAPSHOT CURRENT");
  assert.equal(describeFreshness({ fetchedAt: data.fetchedAt, series: [{ retained: true }], clientCheck: { state: "offline" } }, Date.now()).badge, "OFFLINE");
  assert.match(describeFreshness({ fetchedAt: "2020-01-01T00:00:00.000Z", series: [], clientCheck: { state: "current" } }, Date.now()).badge, /STALE/);
  assert.equal(describeFreshness({ fetchedAt: data.fetchedAt, series: [], clientCheck: { state: "timeout" } }, Date.now()).badge, "CHECK TIMEOUT");
});

test("generator does not subscribe twoy to Yahoo ^UST2Y", () => {
  const src = readFileSync(new URL("./fetch-economy-data.mjs", import.meta.url), "utf8");
  assert.equal(src.includes('symbol: "^UST2Y"'), false);
  assert.equal(src.includes('series: "DGS2"'), true);
  assert.equal(src.includes("alignSpreadExact") || src.includes("buildSpread2s10s"), true);
});

test("panel does not call the snapshot a live provider feed", () => {
  const panel = readFileSync(new URL("../economy/js/panel.js", import.meta.url), "utf8");
  assert.equal(panel.includes("LIVE FEED"), false);
  const app = readFileSync(new URL("../app.jsx", import.meta.url), "utf8");
  assert.match(app, /Economy\.html\?v=20261108/);
  assert.match(app, /ecr-check-freshness/);
  assert.equal(app.includes("economyFrameRef.current.src"), false);
});

const json = JSON.parse(readFileSync(new URL("../economy/data/latest.json", import.meta.url), "utf8"));
const jsText = readFileSync(new URL("../economy/data/latest.js", import.meta.url), "utf8");

test("published json and js payloads match", () => {
  assert.deepEqual(parseLatestJs(jsText), json);
});

test("published snapshot ids, yields, and 2s10s audit", () => {
  const problems = validateSnapshot(json);
  assert.deepEqual(problems, []);
  const byId = Object.fromEntries(json.series.map((s) => [s.id, s]));
  assert.ok(Date.parse(json.fetchedAt) >= Date.parse("2026-11-08T00:00:00.000Z"));
  assert.equal(byId.twoy.symbol, "DGS2");
  assert.notEqual(byId.twoy.source, "yahoo");
  assert.ok(byId.twoy.asOf >= "2026-11-06");
  assert.ok(byId.spread_2s10s.audit.date === String(byId.spread_2s10s.asOf).slice(0, 10));
  assert.ok(Math.abs(byId.spread_2s10s.audit.ten - byId.spread_2s10s.audit.two - byId.spread_2s10s.value) < 0.001);
  if (!byId.tnx.retained) assert.ok(byId.tnx.unitScale === 1 || byId.tnx.unitScale === 0.1);
  assert.ok(byId.tnx.value > 0 && byId.tnx.value < 20);
  assert.ok(byId.unrate.asOf >= "2026-10-01");
  assert.ok(byId.cpi.asOf >= "2026-09-01");
  assert.ok(byId.fedfunds.asOf >= "2026-10-01");
  assert.match(byId.real_policy_rate.asOfNote || "", /same-month/);
  for (const id of ["spx", "nasdaq", "gold", "wti", "btc"]) {
    assert.equal(byId[id].source, "yahoo");
    assert.ok(byId[id].history.length >= 2);
  }
});

function loadFreshness() {
  const sandbox = {
    console,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    fetch: async () => {
      throw new Error("not stubbed");
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.document = {
    baseURI: "http://127.0.0.1:8000/economy/",
    getElementById() {
      return { textContent: "", className: "" };
    },
  };
  sandbox.location = { origin: "http://127.0.0.1:8000" };
  sandbox.parent = { name: "parent" };
  sandbox.addEventListener = () => {};
  vm.runInNewContext(readFileSync(new URL("../economy/js/freshness.js", import.meta.url), "utf8"), sandbox, {
    filename: "freshness.js",
  });
  return sandbox;
}

await testAsync("cache-busted check applies a newer snapshot once", async () => {
  const sandbox = loadFreshness();
  let calls = 0;
  sandbox.fetch = async (url) => {
    calls += 1;
    assert.match(String(url), /latest\.json\?t=/);
    assert.match(String(url), /economy\/data\/latest\.json/);
    return {
      ok: true,
      async json() {
        return { fetchedAt: "2026-11-09T00:00:00.000Z", series: [{ id: "spx", value: 2 }] };
      },
    };
  };
  const current = { fetchedAt: "2026-11-08T00:00:00.000Z", series: [{ id: "spx", value: 1 }] };
  const first = sandbox.ECRFreshness.checkPublishedSnapshot(current, { fetch: sandbox.fetch, baseURI: sandbox.document.baseURI });
  const second = sandbox.ECRFreshness.checkPublishedSnapshot(current, { fetch: sandbox.fetch, baseURI: sandbox.document.baseURI });
  assert.equal(first, second);
  const result = await first;
  await second;
  assert.equal(calls, 1);
  assert.equal(result.state, "updated");
  assert.equal(result.data.series[0].value, 2);
});

await testAsync("offline and timeout keep the previous snapshot", async () => {
  const offline = loadFreshness();
  offline.fetch = async () => {
    throw new TypeError("network down");
  };
  const current = { fetchedAt: "2026-11-08T00:00:00.000Z", series: [{ id: "spx", value: 1 }] };
  const failed = await offline.ECRFreshness.checkPublishedSnapshot(current, {
    fetch: offline.fetch,
    baseURI: offline.document.baseURI,
    timeoutMs: 50,
  });
  assert.equal(failed.state, "offline");
  assert.equal(failed.data, current);

  const slow = loadFreshness();
  slow.fetch = (url, opts) => new Promise((resolve, reject) => {
    opts.signal.addEventListener("abort", () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
  const timed = await slow.ECRFreshness.checkPublishedSnapshot(current, {
    fetch: slow.fetch,
    baseURI: slow.document.baseURI,
    timeoutMs: 30,
  });
  assert.equal(timed.state, "timeout");
  assert.equal(timed.data.series[0].value, 1);
});

test("economy publish is tested before commit and does not touch live-cache", () => {
  const workflow = readFileSync(new URL("../.github/workflows/update-economy-data.yml", import.meta.url), "utf8");
  const validateAt = workflow.indexOf("node scripts/economy-data.test.mjs");
  const publishAt = workflow.indexOf("bash scripts/publish-economy-snapshot.sh");
  assert.ok(validateAt > 0 && publishAt > validateAt);
  assert.equal(workflow.includes("--force"), false);
  assert.equal(workflow.includes("data/live-cache.json"), false);
  assert.match(workflow, /contents:\s*write/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /REQUEST_PAGES_BUILD:\s*"1"/);
  const publisher = readFileSync(new URL("./publish-economy-snapshot.sh", import.meta.url), "utf8");
  assert.match(publisher, /\/repos\/\$\{GITHUB_REPOSITORY\}\/pages\/builds/);
  assert.equal(publisher.includes("--force"), false);
  assert.equal(publisher.includes("data/live-cache.json"), false);
  const liveCache = readFileSync(new URL("../.github/workflows/update-live-cache.yml", import.meta.url), "utf8");
  assert.match(liveCache, /file_pattern:\s*data\/live-cache\.json/);
  assert.equal(liveCache.includes("economy/data"), false);
  assert.equal(liveCache.includes("pages:"), false);
});

function git(cwd, args, env = {}) {
  return execFileSync("git", args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();
}

function writeSnapshot(dir, marker) {
  mkdirSync(join(dir, "economy/data"), { recursive: true });
  mkdirSync(join(dir, "data"), { recursive: true });
  writeFileSync(join(dir, "economy/data/latest.json"), marker + "\n");
  writeFileSync(join(dir, "economy/data/latest.js"), "window.ECR_DATA = " + JSON.stringify({ marker }) + ";\n");
  writeFileSync(join(dir, "economy/data/meta.json"), JSON.stringify({ marker }) + "\n");
  if (!readFileSync(join(dir, "data/live-cache.json"), "utf8").includes("live")) {
    writeFileSync(join(dir, "data/live-cache.json"), "live-v1\n");
  }
}

test("publish rebases onto a concurrent live-cache commit and keeps that file", () => {
  const root = mkdtempSync(join(tmpdir(), "econ-publish-"));
  const bare = join(root, "bare.git");
  const seed = join(root, "seed");
  const worker = join(root, "worker");
  const cacheBot = join(root, "cache-bot");
  const ident = {
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.com",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.com",
  };
  git(root, ["init", "--bare", "-b", "main", bare]);
  git(root, ["init", "-b", "main", seed]);
  git(seed, ["remote", "add", "origin", bare]);
  mkdirSync(join(seed, "data"), { recursive: true });
  mkdirSync(join(seed, "economy/data"), { recursive: true });
  writeFileSync(join(seed, "data/live-cache.json"), "live-v1\n");
  writeSnapshot(seed, "economy-old");
  git(seed, ["add", "."], ident);
  git(seed, ["commit", "-m", "seed"], ident);
  git(seed, ["push", "origin", "HEAD:main"], ident);
  git(root, ["clone", "--depth", "1", bare, worker]);
  git(root, ["clone", bare, cacheBot]);
  writeFileSync(join(cacheBot, "data/live-cache.json"), "live-v2\n");
  git(cacheBot, ["add", "data/live-cache.json"], ident);
  git(cacheBot, ["commit", "-m", "Update live data cache"], ident);
  git(cacheBot, ["push", "origin", "HEAD:main"], ident);
  writeSnapshot(worker, "economy-new");
  writeFileSync(join(worker, "data/live-cache.json"), "live-dirty-local\n");
  execFileSync("bash", [new URL("./publish-economy-snapshot.sh", import.meta.url).pathname], {
    cwd: worker,
    env: {
      ...process.env,
      ...ident,
      PUBLISH_ECONOMY_SNAPSHOT: "1",
      PUBLISH_REMOTE: "origin",
      PUBLISH_BRANCH: "main",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const live = git(bare, ["show", "main:data/live-cache.json"]);
  const economy = git(bare, ["show", "main:economy/data/latest.json"]);
  assert.equal(live, "live-v2\n");
  assert.equal(economy, "economy-new\n");
  const names = git(bare, ["diff", "--name-only", "main~1", "main"]);
  assert.match(names, /economy\/data\/latest\.json/);
  assert.equal(names.includes("data/live-cache.json"), false);
});

await testAsync("parent messages are accepted only from the same frame and origin", async () => {
  const sandbox = loadFreshness();
  const parent = sandbox.parent;
  const good = { source: parent, origin: "http://127.0.0.1:8000", data: { type: "ecr-check-freshness", v: 1 } };
  assert.equal(sandbox.ECRFreshness.trustedParentMessage(good, {
    parent,
    self: sandbox,
    origin: "http://127.0.0.1:8000",
  }), true);
  assert.equal(sandbox.ECRFreshness.trustedParentMessage({
    source: {},
    origin: "http://127.0.0.1:8000",
    data: good.data,
  }, { parent, self: sandbox, origin: "http://127.0.0.1:8000" }), false);
  assert.equal(sandbox.ECRFreshness.trustedParentMessage({
    source: parent,
    origin: "https://evil.example",
    data: good.data,
  }, { parent, self: sandbox, origin: "http://127.0.0.1:8000" }), false);
  assert.equal(sandbox.ECRFreshness.trustedParentMessage({
    source: parent,
    origin: "http://127.0.0.1:8000",
    data: { type: "other", v: 1 },
  }, { parent, self: sandbox, origin: "http://127.0.0.1:8000" }), false);
});

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all economy tests passed");
