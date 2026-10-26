import type { ComponentMeta } from "@sd/sim";
import { issueText } from "../issue-text";
import type { Translate } from "../labels";
import type { RunRecord } from "../store/run-store";
import { eventLevel, eventText } from "./event-text";

export type LogLevel = "info" | "warn" | "error";
export interface LogLine {
  atMs: number;
  level: LogLevel;
  text: string;
}

type T = Translate & { has?(key: string): boolean };

/** The run as log lines: start, the design's warnings, engine events, finish (sorted by time, stable). */
export function buildLogs(
  run: RunRecord,
  ctx: { metas: ReadonlyMap<string, ComponentMeta>; t: T },
): LogLine[] {
  // Names and warnings as they were when the run started, not as the design is now.
  const named = { design: run.snapshot, metas: ctx.metas, t: ctx.t };
  const { input, metrics } = run;
  const lines: LogLine[] = [
    {
      atMs: 0,
      level: "info",
      text: ctx.t("logs.started", {
        id: run.id,
        nodes: input.graph.nodes.length,
        rps: input.workload.baseRps,
        seconds: input.durationMs / 1000,
      }),
    },
    ...run.snapshot.warnings.map((w) => ({
      atMs: 0,
      level: "warn" as const,
      text: ctx.t("logs.warning", { text: issueText(w, named) }),
    })),
    ...run.events.map((e) => ({ atMs: e.atMs, level: eventLevel(e.code), text: eventText(e, named) })),
    {
      atMs: input.durationMs,
      level: "info",
      text: ctx.t("logs.finished", {
        id: run.id,
        ms: Math.round(run.elapsedMs),
        ok: metrics.requestsOk ?? 0,
        failed: (metrics.requestsTotal ?? 0) - (metrics.requestsOk ?? 0),
      }),
    },
  ];
  // Array.prototype.sort is stable: lines at the same time keep the order above.
  return lines.sort((a, b) => a.atMs - b.atMs);
}
