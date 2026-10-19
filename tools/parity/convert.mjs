// Usage: node tools/parity/convert.mjs fixtures/parity/raw/<run>.json <fixture-id> [out-dir]
// Converts a raw reference run into a parity fixture. Copies ONLY numbers, validated ids, enum
// codes and pass/fail. Fails loudly on unknown components, metrics, rules or malformed values so
// nothing is guessed and no free text from the reference can slip into a fixture.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export class ConvertError extends Error {}
const fail = (msg) => {
  throw new ConvertError(msg);
};

const KIND = {
  "component:client": "client",
  "component:load-balancer": "lb",
  "component:api-service": "web-server",
  "component:web-server": "web-server",
  "component:postgres": "postgres",
};
const METRIC = { p95_latency: "p95", p99_latency: "p99", availability: "availability", cost: "costPerMonth" };
// Reference metrics we know about but do not compare (our own metrics cover them differently).
const IGNORED_METRICS = new Set(["web_busy", "errors"]);
const EDGE_KINDS = new Set(["http", "db", "cache", "msg"]);

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const DATE = /^\d{4}-\d\d-\d\d$/;

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

function id(value, where) {
  if (typeof value !== "string" || !ID.test(value)) fail(`${where}: expected an id matching ${ID}`);
  return value;
}

function finite(value, where) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${where}: expected a finite number`);
  return value;
}

function array(value, where) {
  if (!Array.isArray(value)) fail(`${where}: expected an array`);
  return value;
}

function object(value, where) {
  if (!isObject(value)) fail(`${where}: expected an object`);
  return value;
}

function matching(value, re, where) {
  if (typeof value !== "string" || !re.test(value)) fail(`${where}: expected a value matching ${re}`);
  return value;
}

/**
 * Reads the single number in a rule target such as "<= 100 ms", "99.9%" or "$1,200/mo".
 * Thousands separators are stripped. Whatever is left besides the number, comparison signs and
 * spaces must match `unit`, so an unexpected unit (e.g. "s" where "ms" was expected) fails.
 * `exponent` scales by a power of ten in decimal (99.9% -> 0.999 exactly, not 0.9990000000000001).
 */
export function parseTarget(text, unit, where, exponent = 0) {
  if (typeof text !== "string") fail(`${where}: target must be a string`);
  const plain = text.replace(/(\d),(?=\d{3}\b)/g, "$1");
  const numbers = plain.match(/\d+(?:\.\d+)?/g) ?? [];
  if (numbers.length !== 1) fail(`${where}: expected exactly one number in the target`);
  const value = Number(`${numbers[0]}e${exponent}`);
  if (!Number.isFinite(value)) fail(`${where}: target is not a finite number`);
  const rest = plain.replace(numbers[0], "").replace(/[<>=≤≥\s]/g, "");
  if (!unit.test(rest)) fail(`${where}: unexpected unit in the target`);
  return value;
}

const RULE = {
  "latency-p95": { metric: "p95", op: "<=", parse: (t, w) => parseTarget(t, /^ms$/, w) },
  availability: { metric: "availability", op: ">=", parse: (t, w) => parseTarget(t, /^%$/, w, -2) },
  "single-entry": { metric: "exposedBackends", op: "==", parse: () => 0 },
  "no-single-point": { metric: "spofCount", op: "==", parse: (t, w) => parseTarget(t, /^$/, w) },
  budget: { metric: "costPerMonth", op: "<=", parse: (t, w) => parseTarget(t, /^\$?(?:\/mo(?:nth)?)?$/, w) },
};

function convertNode(n, i) {
  const where = `node[${i}]`;
  object(n, where);
  const kind = KIND[n.componentId] ?? fail(`${where}: unknown component ${JSON.stringify(n.componentId)}`);
  const config = {};
  const res = n.config?.resources;
  if (res !== undefined) {
    object(res, `${where}.config.resources`);
    if (res.cpu !== undefined) config.cpu = finite(res.cpu, `${where}.cpu`);
    if (res.memoryGb !== undefined) config.memoryGb = finite(res.memoryGb, `${where}.memoryGb`);
  }
  const rr = n.config?.replication?.readReplicas;
  if (rr !== undefined) config.readReplicas = finite(rr, `${where}.readReplicas`);
  return { id: id(n.id, `${where}.id`), kind, replicas: finite(n.replicas, `${where}.replicas`), config };
}

function convertEdge(e, i) {
  const where = `edge[${i}]`;
  object(e, where);
  if (!EDGE_KINDS.has(e.kind)) fail(`${where}.kind: expected one of ${[...EDGE_KINDS].join(", ")}`);
  return { id: id(e.id, `${where}.id`), from: id(e.from, `${where}.from`), to: id(e.to, `${where}.to`), kind: e.kind };
}

/** Pure conversion: raw run JSON + scenario table -> parity fixture object. Throws ConvertError. */
export function convert(raw, fixtureId, scenarios) {
  id(fixtureId, "fixture id");
  object(raw, "raw");
  const run = object(raw.run, "run");
  const result = object(raw.result, "result");
  const score = object(raw.score, "score");
  const graph = object(object(run.design, "run.design").graph, "run.design.graph");

  const nodes = array(graph.nodes, "run.design.graph.nodes").map(convertNode);
  const edges = array(graph.edges, "run.design.graph.edges").map(convertEdge);

  const simId = matching(object(run.simulation, "run.simulation").id, /^[A-Za-z0-9:_-]{1,64}$/, "run.simulation.id");
  const scenarioId = id(run.scenarioId, "run.scenarioId");
  const key = `${simId}/${scenarioId}`;
  const s = scenarios[key] ?? fail(`add ${key} to tools/parity/scenarios.json`);
  const p = object(run.parameters, "run.parameters");
  let surge = null;
  if (p.surgeMultiplier !== undefined && p.surgeMultiplier !== null) {
    if (!isObject(s.surge)) fail(`scenario ${key} has no surge timing but the run has surgeMultiplier`);
    surge = {
      factor: finite(p.surgeMultiplier, "run.parameters.surgeMultiplier"),
      atMs: finite(s.surge.atMs, `scenario ${key} surge.atMs`),
      durationMs: finite(s.surge.durationMs, `scenario ${key} surge.durationMs`),
    };
  }
  const workload = {
    baseRps: finite(p.baseRps, "run.parameters.baseRps"),
    writeRatio: finite(s.writeRatio, `scenario ${key} writeRatio`),
    clientTimeoutMs: finite(s.clientTimeoutMs, `scenario ${key} clientTimeoutMs`),
    surge,
  };

  const metrics = {};
  for (const [i, m] of array(result.metrics, "result.metrics").entries()) {
    object(m, `result.metrics[${i}]`);
    if (IGNORED_METRICS.has(m.id)) continue;
    const name = METRIC[m.id] ?? fail(`result.metrics[${i}]: unknown metric ${JSON.stringify(m.id)}`);
    metrics[name] = finite(m.value, `result.metrics[${i}].value`);
  }
  const outcomes = object(result.outcomes, "result.outcomes");
  let total = 0;
  for (const v of Object.values(outcomes)) total += finite(v, "result.outcomes value");
  metrics.requestsTotal = total;

  const goals = array(score.rules, "score.rules").map((r, i) => {
    const where = `score.rules[${i}]`;
    object(r, where);
    const rule = RULE[r.ruleId] ?? fail(`${where}: unknown rule ${JSON.stringify(r.ruleId)}`);
    if (r.status !== "passed" && r.status !== "failed") fail(`${where}.status: expected "passed" or "failed"`);
    return { id: r.ruleId, metric: rule.metric, op: rule.op, value: rule.parse(r.target, `${where}.target`), passed: r.status === "passed" };
  });

  return {
    id: fixtureId,
    source: {
      site: "reference",
      runId: matching(run.id, UUID, "run.id"),
      engineVersion: matching(run.engineVersion, SEMVER, "run.engineVersion"),
      capturedAt: matching(typeof run.completedAt === "string" ? run.completedAt.slice(0, 10) : run.completedAt, DATE, "run.completedAt"),
    },
    input: {
      graph: { nodes, edges },
      workload,
      durationMs: finite(s.durationMs, `scenario ${key} durationMs`),
      seed: finite(run.seed, "run.seed"),
    },
    reference: { metrics, goals },
  };
}

function readJson(file, what) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    fail(`cannot read ${what} ${file}: ${e.code ?? e.message}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(`${what} ${file} is not valid JSON`);
  }
}

function main(argv) {
  const [rawPath, fixtureId, outDir = path.join(here, "../../fixtures/parity")] = argv;
  if (!rawPath || !fixtureId) {
    console.error("usage: convert.mjs <raw.json> <fixture-id> [out-dir]");
    return 2;
  }
  try {
    const raw = readJson(rawPath, "raw run");
    const scenarios = readJson(path.join(here, "scenarios.json"), "scenario table");
    const fixture = convert(raw, fixtureId, scenarios);
    const out = path.join(outDir, `${fixtureId}.json`);
    fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`wrote ${out}`);
    return 0;
  } catch (e) {
    if (e instanceof ConvertError) {
      console.error(`convert failed: ${e.message}`);
      return 1;
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
