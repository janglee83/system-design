// Usage: node tools/parity/convert.mjs fixtures/parity/raw/<run>.json <fixture-id>
// Converts a raw reference run into a parity fixture. Copies ONLY numbers, ids, enum codes
// and pass/fail. Fails loudly on unknown components, metrics or rules so nothing is guessed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [rawPath, id] = process.argv.slice(2);
if (!rawPath || !id) {
  console.error("usage: convert.mjs <raw.json> <fixture-id>");
  process.exit(2);
}
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const scenarios = JSON.parse(fs.readFileSync(path.join(here, "scenarios.json"), "utf8"));

const KIND = {
  "component:client": "client",
  "component:load-balancer": "lb",
  "component:api-service": "web-server",
  "component:web-server": "web-server",
  "component:postgres": "postgres",
};
const METRIC = { p95_latency: "p95", p99_latency: "p99", availability: "availability", cost: "costPerMonth" };
const RULE = {
  "latency-p95": { metric: "p95", op: "<=", parse: (t) => Number(t.match(/[\d.]+/)[0]) },
  availability: { metric: "availability", op: ">=", parse: (t) => Number(t.match(/[\d.]+/)[0]) / 100 },
  "single-entry": { metric: "exposedBackends", op: "==", parse: () => 0 },
  "no-single-point": { metric: "spofCount", op: "==", parse: (t) => Number(t.match(/[\d.]+/)[0]) },
  budget: { metric: "costPerMonth", op: "<=", parse: (t) => Number(t.replace(/[^\d.]/g, "")) },
};

const fail = (msg) => { console.error(msg); process.exit(1); };

const nodes = raw.run.design.graph.nodes.map((n) => {
  const kind = KIND[n.componentId] ?? fail(`unknown component ${n.componentId}`);
  const config = {};
  const res = n.config?.resources;
  if (res?.cpu) config.cpu = res.cpu;
  if (res?.memoryGb) config.memoryGb = res.memoryGb;
  const rr = n.config?.replication?.readReplicas;
  if (typeof rr === "number") config.readReplicas = rr;
  return { id: n.id, kind, replicas: n.replicas ?? 1, config };
});
const edges = raw.run.design.graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, kind: e.kind }));

const key = `${raw.run.simulation.id}/${raw.run.scenarioId}`;
const s = scenarios[key] ?? fail(`add ${key} to tools/parity/scenarios.json`);
const p = raw.run.parameters;
const workload = {
  baseRps: p.baseRps,
  writeRatio: s.writeRatio,
  clientTimeoutMs: s.clientTimeoutMs,
  surge: p.surgeMultiplier ? { factor: p.surgeMultiplier, atMs: s.surge.atMs, durationMs: s.surge.durationMs } : null,
};

const metrics = {};
for (const m of raw.result.metrics) {
  if (METRIC[m.id]) metrics[METRIC[m.id]] = m.value;
}
metrics.requestsTotal = Object.values(raw.result.outcomes).reduce((a, b) => a + b, 0);

const goals = raw.score.rules.map((r) => {
  const rule = RULE[r.ruleId] ?? fail(`unknown rule ${r.ruleId}`);
  return { id: r.ruleId, metric: rule.metric, op: rule.op, value: rule.parse(r.target ?? ""), passed: r.status === "passed" };
});

const fixture = {
  id,
  source: { site: "reference", runId: raw.run.id, engineVersion: raw.run.engineVersion, capturedAt: raw.run.completedAt?.slice(0, 10) ?? "" },
  input: { graph: { nodes, edges }, workload, durationMs: s.durationMs, seed: raw.run.seed ?? 1 },
  reference: { metrics, goals },
};
const out = path.join(here, "../../fixtures/parity", `${id}.json`);
fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
console.log(`wrote ${out}`);
