import type { Calibration, CalibrationOverrides, ComponentMeta, ConfigValue, EdgeKind, Fault, Workload } from "@sd/sim";
import { NODE_SIZE, type Design, type LabEdge, type LabGroup, type LabNode, type XY } from "./design";
import { inferEdgeKind } from "./edge-kind";
import { nextId } from "./ids";

export const GRID = 16;
export const MAX_REPLICAS = 1000;
const GROUP_PAD = 32;
const GROUP_LABEL = 24;

export const snap = (v: number): number => Math.round(v / GRID) * GRID;
export const isLocked = (d: Design, id: string): boolean => d.locked.includes(id);

export interface Clipboard {
  nodes: LabNode[];
  edges: LabEdge[];
}
export interface ItemSelection {
  nodes: readonly string[];
  edges: readonly string[];
  groups: readonly string[];
}

export function addNode(d: Design, meta: ComponentMeta, at: XY): { design: Design; id: string } {
  const id = nextId(`${meta.kind}-`, d.nodes.map((n) => n.id));
  const node: LabNode = {
    id,
    kind: meta.kind,
    label: "",
    replicas: 1,
    config: {},
    position: { x: snap(at.x), y: snap(at.y) },
    groupId: null,
  };
  return { design: { ...d, nodes: [...d.nodes, node] }, id };
}

const PLACE_STEP = Math.round((NODE_SIZE.width + 2 * GRID) / GRID) * GRID;

/** The first grid spot at or to the right of `at` where a new card covers no other card. */
export function freeSpot(d: Design, at: XY): XY {
  const p = { x: snap(at.x), y: snap(at.y) };
  const covers = (q: XY) =>
    d.nodes.some((n) => Math.abs(n.position.x - q.x) < NODE_SIZE.width && Math.abs(n.position.y - q.y) < NODE_SIZE.height);
  for (let i = 0; i < 100 && covers(p); i++) p.x += PLACE_STEP;
  return p;
}

export function moveNodes(d: Design, moves: Readonly<Record<string, XY>>): Design {
  let changed = false;
  const nodes = d.nodes.map((n) => {
    const p = moves[n.id];
    if (!p || (p.x === n.position.x && p.y === n.position.y)) return n;
    changed = true;
    return { ...n, position: { x: p.x, y: p.y } };
  });
  return changed ? { ...d, nodes } : d;
}

export type ConnectRefusal = "self" | "duplicate" | "not-accepted" | "unknown-node";
export type ConnectResult = { design: Design; edgeId: string } | { design: Design; refused: ConnectRefusal };

export function connect(d: Design, from: string, to: string, metas: ReadonlyMap<string, ComponentMeta>): ConnectResult {
  if (from === to) return { design: d, refused: "self" };
  const source = d.nodes.find((n) => n.id === from);
  const target = d.nodes.find((n) => n.id === to);
  if (!source || !target) return { design: d, refused: "unknown-node" };
  if (d.edges.some((e) => e.from === from && e.to === to)) return { design: d, refused: "duplicate" };
  const meta = metas.get(target.kind);
  // An unknown kind (from an imported file) gets http; validation reports node.unknown-kind.
  const kind = meta ? inferEdgeKind(meta) : "http";
  if (kind === null) return { design: d, refused: "not-accepted" };
  const id = nextId("e", d.edges.map((e) => e.id));
  return { design: { ...d, edges: [...d.edges, { id, from, to, kind }] }, edgeId: id };
}

export function deleteItems(d: Design, sel: ItemSelection): Design {
  const nodeIds = new Set(sel.nodes.filter((id) => !isLocked(d, id)));
  const edgeIds = new Set(sel.edges);
  const groupIds = new Set(sel.groups);
  const nodes = d.nodes
    .filter((n) => !nodeIds.has(n.id))
    .map((n) => (n.groupId !== null && groupIds.has(n.groupId) ? { ...n, groupId: null } : n));
  const edges = d.edges.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.from) && !nodeIds.has(e.to));
  const groups = d.groups.filter((g) => !groupIds.has(g.id));
  if (nodes.length === d.nodes.length && edges.length === d.edges.length && groups.length === d.groups.length) return d;
  // A fault aimed at a deleted node falls back to "any matching" rather than pointing at nothing.
  const faults = d.faults.some((f) => f.target !== null && nodeIds.has(f.target))
    ? d.faults.map((f) => (f.target !== null && nodeIds.has(f.target) ? { ...f, target: null } : f))
    : d.faults;
  return dropEmptyGroups({ ...d, nodes, edges, groups, faults });
}

function mapNode(d: Design, id: string, f: (n: LabNode) => LabNode): Design {
  if (isLocked(d, id)) return d;
  let changed = false;
  const nodes = d.nodes.map((n) => {
    if (n.id !== id) return n;
    const next = f(n);
    changed = next !== n;
    return next;
  });
  return changed ? { ...d, nodes } : d;
}

export function updateNode(d: Design, id: string, patch: { label?: string; replicas?: number }): Design {
  return mapNode(d, id, (n) => {
    const label = patch.label ?? n.label;
    const replicas =
      patch.replicas === undefined
        ? n.replicas
        : Math.min(MAX_REPLICAS, Math.max(1, Math.round(Number.isFinite(patch.replicas) ? patch.replicas : 1)));
    return label === n.label && replicas === n.replicas ? n : { ...n, label, replicas };
  });
}

export function setConfig(d: Design, id: string, key: string, value: ConfigValue | undefined): Design {
  return mapNode(d, id, (n) => {
    if (n.config[key] === value) return n;
    const config = { ...n.config };
    if (value === undefined) delete config[key];
    else config[key] = value;
    return { ...n, config };
  });
}

export function setEdgeKind(d: Design, id: string, kind: EdgeKind): Design {
  const e = d.edges.find((x) => x.id === id);
  if (!e || e.kind === kind) return d;
  return { ...d, edges: d.edges.map((x) => (x.id === id ? { ...x, kind } : x)) };
}

export function copyItems(d: Design, nodeIds: readonly string[]): Clipboard {
  const set = new Set(nodeIds);
  return {
    nodes: d.nodes.filter((n) => set.has(n.id)).map((n) => structuredClone(n)),
    edges: d.edges.filter((e) => set.has(e.from) && set.has(e.to)).map((e) => ({ ...e })),
  };
}

export function pasteItems(d: Design, clip: Clipboard, offset: XY): { design: Design; ids: string[] } {
  const taken = new Set(d.nodes.map((n) => n.id));
  const idMap = new Map<string, string>();
  const nodes = clip.nodes.map((n) => {
    const id = nextId(`${n.kind}-`, taken);
    taken.add(id);
    idMap.set(n.id, id);
    return {
      ...structuredClone(n),
      id,
      position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      groupId: null,
    };
  });
  const edgeTaken = new Set(d.edges.map((e) => e.id));
  const edges = clip.edges.map((e) => {
    const id = nextId("e", edgeTaken);
    edgeTaken.add(id);
    return { ...e, id, from: idMap.get(e.from)!, to: idMap.get(e.to)! };
  });
  if (nodes.length === 0) return { design: d, ids: [] };
  return { design: { ...d, nodes: [...d.nodes, ...nodes], edges: [...d.edges, ...edges] }, ids: nodes.map((n) => n.id) };
}

export function duplicateItems(d: Design, ids: readonly string[]): { design: Design; ids: string[] } {
  return pasteItems(d, copyItems(d, ids), { x: 2 * GRID, y: 2 * GRID });
}

function frameAround(members: readonly LabNode[]): Pick<LabGroup, "position" | "size"> {
  const minX = Math.min(...members.map((n) => n.position.x)) - GROUP_PAD;
  const minY = Math.min(...members.map((n) => n.position.y)) - GROUP_PAD - GROUP_LABEL;
  const maxX = Math.max(...members.map((n) => n.position.x + NODE_SIZE.width)) + GROUP_PAD;
  const maxY = Math.max(...members.map((n) => n.position.y + NODE_SIZE.height)) + GROUP_PAD;
  return { position: { x: minX, y: minY }, size: { width: maxX - minX, height: maxY - minY } };
}

function dropEmptyGroups(d: Design): Design {
  const used = new Set(d.nodes.map((n) => n.groupId));
  const groups = d.groups.filter((g) => used.has(g.id));
  return groups.length === d.groups.length ? d : { ...d, groups };
}

export function groupNodes(d: Design, ids: readonly string[]): { design: Design; id: string } | null {
  const set = new Set(ids);
  const members = d.nodes.filter((n) => set.has(n.id));
  if (members.length === 0) return null;
  const id = nextId("g", d.groups.map((g) => g.id));
  const group: LabGroup = { id, label: "", ...frameAround(members) };
  const nodes = d.nodes.map((n) => (set.has(n.id) ? { ...n, groupId: id } : n));
  return { design: dropEmptyGroups({ ...d, nodes, groups: [...d.groups, group] }), id };
}

export function ungroup(d: Design, id: string): Design {
  if (!d.groups.some((g) => g.id === id)) return d;
  return {
    ...d,
    groups: d.groups.filter((g) => g.id !== id),
    nodes: d.nodes.map((n) => (n.groupId === id ? { ...n, groupId: null } : n)),
  };
}

export function moveGroup(d: Design, id: string, to: XY): Design {
  const g = d.groups.find((x) => x.id === id);
  if (!g) return d;
  const dx = to.x - g.position.x;
  const dy = to.y - g.position.y;
  if (dx === 0 && dy === 0) return d;
  return {
    ...d,
    groups: d.groups.map((x) => (x.id === id ? { ...x, position: { x: to.x, y: to.y } } : x)),
    nodes: d.nodes.map((n) =>
      n.groupId === id ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
    ),
  };
}

export function renameGroup(d: Design, id: string, label: string): Design {
  const g = d.groups.find((x) => x.id === id);
  if (!g || g.label === label) return d;
  return { ...d, groups: d.groups.map((x) => (x.id === id ? { ...x, label } : x)) };
}

/** Refits every frame around its members (after auto-layout). */
export function fitGroups(d: Design): Design {
  if (d.groups.length === 0) return d;
  return {
    ...d,
    groups: d.groups.map((g) => {
      const members = d.nodes.filter((n) => n.groupId === g.id);
      return members.length ? { ...g, ...frameAround(members) } : g;
    }),
  };
}

export const setName = (d: Design, name: string): Design => (d.name === name ? d : { ...d, name });
export const setDuration = (d: Design, durationMs: number): Design =>
  d.durationMs === durationMs ? d : { ...d, durationMs };
export const setSeed = (d: Design, seed: number): Design => (d.seed === seed ? d : { ...d, seed });
const sameFault = (a: Fault, b: Fault) => a.kind === b.kind && a.target === b.target && a.atMs === b.atMs;
export const setFaults = (d: Design, faults: Fault[]): Design =>
  faults.length === d.faults.length && faults.every((f, i) => sameFault(f, d.faults[i]!)) ? d : { ...d, faults };

/** Patches the workload. An optional field patched to `undefined` is removed, not kept as undefined. */
export function setWorkload(d: Design, patch: Partial<Workload>): Design {
  const keys = Object.keys(patch) as (keyof Workload)[];
  const same = (k: keyof Workload) => Object.is(d.workload[k], patch[k]) && (patch[k] !== undefined || !(k in d.workload));
  if (keys.every(same)) return d;
  const workload: Workload = { ...d.workload, ...patch };
  for (const k of keys) if (patch[k] === undefined) delete workload[k];
  return { ...d, workload };
}

export function setCalibration(
  d: Design,
  key: keyof Calibration,
  value: number | undefined,
  defaults: Calibration,
): Design {
  const calibration: CalibrationOverrides = { ...d.calibration };
  if (value === undefined || value === defaults[key]) delete calibration[key];
  else calibration[key] = value;
  const same =
    Object.keys(calibration).length === Object.keys(d.calibration).length &&
    (Object.keys(calibration) as (keyof Calibration)[]).every((k) => calibration[k] === d.calibration[k]);
  return same ? d : { ...d, calibration };
}
