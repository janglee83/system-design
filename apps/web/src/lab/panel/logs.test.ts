import { sim } from "@sd/sim/node";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { designFromInput, fourTier } from "../../test/engine-fixtures";
import { META_BY_KIND } from "../../test/metas";
import type { RunRecord } from "../store/run-store";
import { buildLogs } from "./logs";

const t = createTranslator({ locale: "en", messages: en });

function record() {
  const input = { ...fourTier(), faults: [{ kind: "instance-down" as const, target: "web", atMs: 3000 }] };
  const run = sim.simulate(input);
  const r: RunRecord = {
    id: 7,
    engineRunId: 1,
    epoch: 0,
    startedAt: 0,
    input,
    metrics: run.metrics,
    events: run.events,
    timeline: run.timeline,
    traces: run.traceSummaries(),
    elapsedMs: 12.4,
  };
  return { r, design: designFromInput(input) };
}

describe("buildLogs", () => {
  it("starts and finishes the run, with engine events in time order between", () => {
    const { r, design } = record();
    const lines = buildLogs(r, { design, metas: META_BY_KIND, t, warnings: [] });
    expect(lines[0]).toEqual({ atMs: 0, level: "info", text: "Run 7 started: 4 components, 2000 requests/s for 10 s." });
    const last = lines.at(-1)!;
    expect(last.atMs).toBe(10_000);
    expect(last.text).toMatch(/^Run 7 finished in 12 ms: \d+ answered, \d+ not answered\.$/);
    const down = lines.find((l) => l.text.includes("one instance stopped"));
    expect(down).toMatchObject({ atMs: 3000, level: "error" });
    expect(lines.map((l) => l.atMs)).toEqual([...lines.map((l) => l.atMs)].sort((a, b) => a - b));
  });

  it("puts the design's warnings right after the start line", () => {
    const { r, design } = record();
    const warning = { code: "node.unreachable", blocking: false, nodeId: "pg", edgeId: null, field: null };
    const lines = buildLogs(r, { design, metas: META_BY_KIND, t, warnings: [warning] });
    expect(lines[1]).toMatchObject({ atMs: 0, level: "warn" });
    expect(lines[1]!.text).toMatch(/^Before the run: .*gets no requests/);
  });
});
