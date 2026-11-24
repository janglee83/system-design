"use client";
import { useMemo } from "react";
import { edgeStatesAt, liveAt, type EdgeState, type NodeLive, type NodeState } from "../model/node-state";
import { toEngineGraph } from "../model/sim-input";
import { currentRun, type RunRecord } from "../store/run-store";
import { useDesign, usePlayback, useRuns } from "../store/LabStores";
import { frameAt } from "./clock";

export interface PlaybackView {
  run: RunRecord;
  frame: number;
  /** The run still matches the design's graph (moving nodes keeps it; any graph edit makes it stale). */
  active: boolean;
  live: Record<string, NodeLive>;
  states: Record<string, NodeState>;
  edgeStates: Record<string, EdgeState>;
  /** Approximate requests in flight per edge (R19: the target's in-flight split over its in-degree). */
  edgeRates: Record<string, number>;
}

export function usePlaybackView(): PlaybackView | null {
  const run = useRuns((s) => currentRun(s));
  const status = useRuns((s) => s.status);
  const timeMs = usePlayback((s) => s.timeMs);
  const design = useDesign((s) => s.design);
  const graphKey = useMemo(() => JSON.stringify(toEngineGraph(design)), [design]);
  const runKey = useMemo(() => (run ? JSON.stringify(run.input.graph) : ""), [run]);
  const frame = run ? frameAt(timeMs, run.timeline.frameMs, run.timeline.frames) : 0;
  return useMemo(() => {
    if (!run) return null;
    const active = status !== "running" && graphKey === runKey;
    if (!active) return { run, frame, active, live: {}, states: {}, edgeStates: {}, edgeRates: {} };
    const live = liveAt(run.timeline, frame);
    const states = Object.fromEntries(Object.entries(live).map(([id, l]) => [id, l.state]));
    const edges = run.input.graph.edges;
    const indegree: Record<string, number> = {};
    for (const e of edges) indegree[e.to] = (indegree[e.to] ?? 0) + 1;
    const edgeRates = Object.fromEntries(edges.map((e) => [e.id, (live[e.to]?.inFlight ?? 0) / (indegree[e.to] ?? 1)]));
    return { run, frame, active, live, states, edgeStates: edgeStatesAt(edges, states), edgeRates };
  }, [run, frame, status, graphKey, runKey]);
}
