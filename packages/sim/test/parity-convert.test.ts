import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./helpers";
import { convert, parseTarget } from "../../../tools/parity/convert.mjs";

const toolDir = path.join(repoRoot, "tools/parity");
const samplePath = path.join(toolDir, "testdata/raw-sample.json");
const scenarios = JSON.parse(fs.readFileSync(path.join(toolDir, "scenarios.json"), "utf8"));
const sample = (): any => JSON.parse(fs.readFileSync(samplePath, "utf8"));

describe("tools/parity/convert.mjs", () => {
  it("converts the synthetic sample into a parity fixture", () => {
    const f = convert(sample(), "sample-fixture", scenarios);
    expect(f.source).toEqual({
      site: "reference",
      runId: "00000000-0000-4000-8000-000000000001",
      engineVersion: "0.0.1",
      capturedAt: "2026-01-02",
    });
    expect(f.input.graph.nodes[2]).toEqual({ id: "web", kind: "web-server", replicas: 5, config: { cpu: 1, memoryGb: 2 } });
    expect(f.input.workload).toEqual({
      baseRps: 8000,
      writeRatio: 0,
      clientTimeoutMs: 1000,
      surge: { factor: 3, atMs: 4000, durationMs: 1500 },
    });
    expect(f.input.durationMs).toBe(11000);
    expect(f.input.seed).toBe(7);
    expect(f.reference.metrics).toEqual({ p95: 7, p99: 8, availability: 0.999, costPerMonth: 162.5, requestsTotal: 1025 });
    expect(f.reference.goals).toEqual([
      { id: "latency-p95", metric: "p95", op: "<=", value: 100, passed: true },
      { id: "availability", metric: "availability", op: ">=", value: 0.999, passed: true },
      { id: "single-entry", metric: "exposedBackends", op: "==", value: 0, passed: true },
      { id: "no-single-point", metric: "spofCount", op: "==", value: 0, passed: true },
      { id: "budget", metric: "costPerMonth", op: "<=", value: 1200, passed: false },
    ]);
  });

  it("keeps cpu: 0 instead of dropping it", () => {
    const raw = sample();
    raw.run.design.graph.nodes[2].config.resources.cpu = 0;
    expect(convert(raw, "x", scenarios).input.graph.nodes[2].config.cpu).toBe(0);
  });

  it("copies no free text: every string in the output is an id, code or date", () => {
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(convert(sample(), "sample-fixture", scenarios));
    for (const s of strings) expect(s).toMatch(/^[A-Za-z0-9:._<>=-]{1,64}$/);
  });

  const failures: Array<[string, (raw: any) => void, RegExp]> = [
    ["an unknown metric", (r) => r.result.metrics.push({ id: "mystery", value: 1 }), /unknown metric/],
    ["a node id with prose", (r) => (r.run.design.graph.nodes[0].id = "the users of the app"), /node\[0\]\.id/],
    ["an edge endpoint with prose", (r) => (r.run.design.graph.edges[0].to = "a load balancer"), /edge\[0\]\.to/],
    ["an unknown edge kind", (r) => (r.run.design.graph.edges[0].kind = "grpc"), /edge\[0\]\.kind/],
    ["a prose run id", (r) => (r.run.id = "my favourite run"), /run\.id/],
    ["a prose engine version", (r) => (r.run.engineVersion = "latest build"), /engineVersion/],
    ["a prose completion date", (r) => (r.run.completedAt = "yesterday"), /completedAt/],
    ["a non-finite metric value", (r) => (r.result.metrics[0].value = "fast"), /metrics\[0\]\.value/],
    ["a missing replicas count", (r) => delete r.run.design.graph.nodes[1].replicas, /node\[1\]\.replicas/],
    ["a missing seed", (r) => delete r.run.seed, /run\.seed/],
    ["non-numeric outcomes", (r) => (r.result.outcomes.ok = "many"), /outcomes/],
    ["outcomes that are not an object", (r) => (r.result.outcomes = [1, 2]), /outcomes/],
    ["an unknown rule status", (r) => (r.score.rules[0].status = "skipped"), /status/],
    ["a target with an unexpected unit", (r) => (r.score.rules[0].target = "<= 1 s"), /unexpected unit/],
    ["a target without a number", (r) => (r.score.rules[1].target = "high"), /exactly one number/],
    ["missing rules", (r) => delete r.score.rules, /score\.rules/],
    ["an unknown component", (r) => (r.run.design.graph.nodes[0].componentId = "component:queue"), /unknown component/],
    ["an unmapped scenario", (r) => (r.run.scenarioId = "steady"), /scenarios\.json/],
  ];
  for (const [what, mutate, message] of failures) {
    it(`fails on ${what}`, () => {
      const raw = sample();
      mutate(raw);
      expect(() => convert(raw, "x", scenarios)).toThrow(message);
    });
  }

  it("fails when a scenario has no surge timing but the run surges", () => {
    const table = { "sim:scale-web-tier/surge": { durationMs: 1000, clientTimeoutMs: 1000, writeRatio: 0 } };
    expect(() => convert(sample(), "x", table)).toThrow(/no surge timing/);
  });

  it("rejects a fixture id that is not an id", () => {
    expect(() => convert(sample(), "../escape", scenarios)).toThrow(/fixture id/);
  });

  it("parses targets with thousands separators and rejects several numbers", () => {
    expect(parseTarget("<= $12,500/month", /^\$?(?:\/mo(?:nth)?)?$/, "t")).toBe(12500);
    expect(() => parseTarget("100 to 200 ms", /^ms$/, "t")).toThrow(/exactly one number/);
  });

  it("runs as a CLI, writes the fixture and exits non-zero on bad input", () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "parity-convert-"));
    const ok = spawnSync(process.execPath, [path.join(toolDir, "convert.mjs"), samplePath, "sample-fixture", out], { encoding: "utf8" });
    expect(ok.status, ok.stderr).toBe(0);
    const written = JSON.parse(fs.readFileSync(path.join(out, "sample-fixture.json"), "utf8"));
    expect(written.id).toBe("sample-fixture");

    const bad = path.join(out, "bad.json");
    fs.writeFileSync(bad, "{not json");
    const r = spawnSync(process.execPath, [path.join(toolDir, "convert.mjs"), bad, "x", out], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/not valid JSON/);
    const missing = spawnSync(process.execPath, [path.join(toolDir, "convert.mjs"), path.join(out, "nope.json"), "x", out], { encoding: "utf8" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/cannot read raw run/);
  });
});
