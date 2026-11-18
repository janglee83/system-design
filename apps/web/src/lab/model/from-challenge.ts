import type { Challenge } from "@sd/content";
import type { Fault, GraphLimits, Workload } from "@sd/sim";
import { defaultWorkload, emptyDesign, type Design, type LabNode } from "./design";

type RawNode = { id: string; kind: string; label?: string; replicas?: number; config?: Record<string, never> };
type RawEdge = { id: string; from: string; to: string; kind: Design["edges"][number]["kind"] };
type RawStart = { graph: { nodes: RawNode[]; edges: RawEdge[] }; workload?: Partial<Workload>; faults?: Fault[]; durationMs?: number; seed?: number; calibration?: Design["calibration"] };
type RawMode = { id: string; faults?: Fault[]; workloadOverride?: Record<string, unknown> };

/** Columns by distance from the clients (no layout engine on the server). */
function positions(nodes: RawNode[], edges: RawEdge[]): Map<string, { x: number; y: number }> {
  const depth = new Map<string, number>();
  const incoming = new Set(edges.map((e) => e.to));
  const queue = nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id);
  queue.forEach((id) => depth.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of edges.filter((x) => x.from === id)) {
      if (!depth.has(e.to)) {
        depth.set(e.to, depth.get(id)! + 1);
        queue.push(e.to);
      }
    }
  }
  const rows = new Map<number, number>();
  const out = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const col = depth.get(n.id) ?? 0;
    const row = rows.get(col) ?? 0;
    rows.set(col, row + 1);
    out.set(n.id, { x: 64 + col * 272, y: 64 + row * 128 });
  }
  return out;
}

/** R24: sim-core serde defaults, seed 1, the chosen mode (default: the first). */
export function designFromChallenge(c: Challenge, modeId?: string): Design | null {
  const start = c.start as unknown as RawStart;
  const modes = c.modes as unknown as RawMode[];
  const mode = modeId ? modes.find((m) => m.id === modeId) : modes[0];
  if (!mode) return null;
  const pos = positions(start.graph.nodes, start.graph.edges);
  const nodes: LabNode[] = start.graph.nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    label: n.label ?? "",
    replicas: n.replicas ?? 1,
    config: { ...(n.config ?? {}) },
    position: pos.get(n.id)!,
    groupId: null,
  }));
  let workload: Workload = { ...defaultWorkload(), ...start.workload, params: { ...(start.workload?.params ?? {}) } };
  for (const [k, v] of Object.entries(mode.workloadOverride ?? {})) {
    if (v === null && k !== "surge") delete (workload as unknown as Record<string, unknown>)[k];
    else (workload as unknown as Record<string, unknown>)[k] = v;
  }
  workload = { ...defaultWorkload(), ...workload };
  const limits = c.limits as unknown as Partial<GraphLimits>;
  return {
    ...emptyDesign(""),
    nodes,
    edges: start.graph.edges.map((e) => ({ ...e })),
    workload,
    faults: (mode.faults ?? []).map((f) => ({ kind: f.kind, target: f.target ?? null, atMs: f.atMs })),
    calibration: { ...(start.calibration ?? {}) },
    durationMs: start.durationMs ?? 10_000,
    seed: start.seed ?? 1,
    locked: [...(c.lockedNodes as string[])],
    challenge: {
      id: c.id,
      mode: mode.id,
      limits: { maxNodes: limits.maxNodes ?? null, maxInstances: limits.maxInstances ?? null, allowedKinds: limits.allowedKinds ?? null },
    },
  };
}
