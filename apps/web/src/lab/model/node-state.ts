import type { TimelineView } from "@sd/sim";
import type { NodeState } from "../canvas/rf-adapter";

export type { NodeState };
export type EdgeState = "normal" | "hot" | "dead";

/** Spec §5.4 / R19: down when no instance is up, overloaded when rejecting or ≥ 95 % busy, busy from 70 %. */
export function nodeState(v: { busy: number; rejected: number; up: number }): NodeState {
  if (v.up === 0) return "down";
  if (v.rejected > 0 || v.busy >= 0.95) return "overloaded";
  if (v.busy >= 0.7) return "busy";
  return "normal";
}

const clampFrame = (tl: TimelineView, frame: number) => Math.min(tl.frames - 1, Math.max(0, frame));

export function statesAt(tl: TimelineView, frame: number): Record<string, NodeState> {
  const out: Record<string, NodeState> = {};
  if (tl.frames === 0) return out;
  const f = clampFrame(tl, frame);
  for (const id of tl.nodeIds) out[id] = nodeState({ busy: tl.value(f, id, "busy"), rejected: tl.value(f, id, "rejected"), up: tl.value(f, id, "up") });
  return out;
}

/** What a tile shows while playing (design-system §5): the state, load, work in flight, rejections, and since when it is down. */
export interface NodeLive {
  state: NodeState;
  load: number;
  inFlight: number;
  rejected: number;
  downSinceMs: number | null;
}

export function liveAt(tl: TimelineView, frame: number): Record<string, NodeLive> {
  const out: Record<string, NodeLive> = {};
  if (tl.frames === 0) return out;
  const f = clampFrame(tl, frame);
  for (const id of tl.nodeIds) {
    const busy = tl.value(f, id, "busy");
    const rejected = tl.value(f, id, "rejected");
    const up = tl.value(f, id, "up");
    let downSinceMs: number | null = null;
    if (up === 0) {
      let k = f;
      while (k > 0 && tl.value(k - 1, id, "up") === 0) k--;
      downSinceMs = k * tl.frameMs;
    }
    out[id] = { state: nodeState({ busy, rejected, up }), load: busy, inFlight: tl.value(f, id, "inFlight"), rejected, downSinceMs };
  }
  return out;
}

/** §6.1 running edges: into an overloaded node is hot; to or from a down node is dead. */
export function edgeStatesAt(edges: readonly { id: string; from: string; to: string }[], states: Readonly<Record<string, NodeState>>): Record<string, EdgeState> {
  const out: Record<string, EdgeState> = {};
  for (const e of edges) {
    out[e.id] = states[e.from] === "down" || states[e.to] === "down" ? "dead" : states[e.to] === "overloaded" ? "hot" : "normal";
  }
  return out;
}
