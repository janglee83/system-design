import type { ComponentMeta, Fault, FaultKind, Role } from "@sd/sim";
import type { Design } from "./design";
import { mulberry32 } from "./rng";

/** R20: which nodes a fault can hit. "unbuilt" kinds need components that do not exist yet. */
export const FAULT_TARGETS: Record<FaultKind, readonly Role[] | "none" | "unbuilt"> = {
  "traffic-surge-3x": "none",
  "instance-down": ["service"],
  "instance-slow": ["service"],
  "lb-node-down": ["balancer"],
  "cache-down": "unbuilt",
  "db-overloaded": ["database"],
  "db-primary-down": ["database"],
  "db-replica-down": ["database"],
  "db-stalled": ["database"],
  "broker-down": "unbuilt",
  "object-storage-down": "unbuilt",
  "kv-node-down": "unbuilt",
  "third-party-down": "unbuilt",
  "third-party-slow": "unbuilt",
};

export function targetsFor(kind: FaultKind, d: Design, metas: ReadonlyMap<string, ComponentMeta>): string[] {
  const rule = FAULT_TARGETS[kind];
  if (rule === "none" || rule === "unbuilt") return [];
  return d.nodes.filter((n) => {
    const role = metas.get(n.kind)?.role;
    return role !== undefined && rule.includes(role);
  }).map((n) => n.id);
}

/** R20: seeded by the design's seed and how many faults it already has. */
export function randomFault(d: Design, metas: ReadonlyMap<string, ComponentMeta>, supported: readonly FaultKind[]): Fault | null {
  const rand = mulberry32((d.seed + 7919 * d.faults.length) >>> 0);
  const candidates = supported.filter((k) => FAULT_TARGETS[k] === "none" || targetsFor(k, d, metas).length > 0);
  if (candidates.length === 0) return null;
  const kind = candidates[Math.floor(rand() * candidates.length)]!;
  const targets = targetsFor(kind, d, metas);
  const target = targets.length ? targets[Math.floor(rand() * targets.length)]! : null;
  const atMs = Math.round((d.durationMs * (0.2 + 0.5 * rand())) / 100) * 100;
  return { kind, target, atMs };
}

/** R20 default for a new fault: the first supported kind that has a target, at 30% of the run. */
export function defaultFault(d: Design, metas: ReadonlyMap<string, ComponentMeta>, supported: readonly FaultKind[]): Fault {
  const kind = supported.find((k) => targetsFor(k, d, metas).length > 0) ?? "traffic-surge-3x";
  return { kind, target: null, atMs: Math.round((d.durationMs * 0.3) / 100) * 100 };
}
