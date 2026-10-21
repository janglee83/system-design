import type { ComponentMeta } from "@sd/sim";
import { layoutPositions } from "./canvas/layout";
import {
  connect,
  copyItems,
  deleteItems,
  duplicateItems,
  fitGroups,
  groupNodes,
  moveNodes,
  pasteItems,
  ungroup,
  type ConnectRefusal,
} from "./model/ops";
import type { DesignStore } from "./store/design-store";
import type { UiStore } from "./store/ui-store";

export type ConnectOutcome = { ok: true; edgeId: string } | { ok: false; reason: ConnectRefusal };

export function connectNodes(
  api: DesignStore,
  metas: ReadonlyMap<string, ComponentMeta>,
  from: string,
  to: string,
): ConnectOutcome {
  // Widened on purpose: TS cannot see the assignment inside the apply() callback below.
  let outcome = { ok: false, reason: "unknown-node" } as ConnectOutcome;
  api.getState().apply((d) => {
    const r = connect(d, from, to, metas);
    outcome = "edgeId" in r ? { ok: true, edgeId: r.edgeId } : { ok: false, reason: r.refused };
    return r.design;
  });
  if (outcome.ok) api.getState().select({ nodes: [], edges: [outcome.edgeId], groups: [] });
  return outcome;
}

export function deleteSelection(api: DesignStore): void {
  const sel = api.getState().selection;
  api.getState().apply((d) => deleteItems(d, sel));
}

export function duplicateSelection(api: DesignStore): void {
  let ids: string[] = [];
  api.getState().apply((d) => {
    const r = duplicateItems(d, api.getState().selection.nodes);
    ids = r.ids;
    return r.design;
  });
  if (ids.length) api.getState().select({ nodes: ids, edges: [], groups: [] });
}

/**
 * Copies the selected nodes (and the edges between them) to this Lab's clipboard. The system
 * clipboard is left alone: nothing reads a design back from it.
 */
export function copySelection(api: DesignStore): void {
  const { design, selection } = api.getState();
  if (selection.nodes.length === 0) return;
  api.getState().setClipboard(copyItems(design, selection.nodes));
}

/** Pastes the clipboard; each paste of the same copy lands 32 px further away. */
export function pasteClipboard(api: DesignStore): void {
  const clip = api.getState().clipboard;
  if (!clip) return;
  const n = api.getState().countPaste();
  let ids: string[] = [];
  api.getState().apply((d) => {
    const r = pasteItems(d, clip, { x: 32 * n, y: 32 * n });
    ids = r.ids;
    return r.design;
  });
  api.getState().select({ nodes: ids, edges: [], groups: [] });
}

export function selectAll(api: DesignStore): void {
  const d = api.getState().design;
  api.getState().select({ nodes: d.nodes.map((n) => n.id), edges: d.edges.map((e) => e.id), groups: d.groups.map((g) => g.id) });
}
export const undo = (api: DesignStore) => api.getState().undo();
export const redo = (api: DesignStore) => api.getState().redo();

export function toggleSnap(ui: UiStore): void {
  ui.getState().set({ snap: !ui.getState().snap });
}

/** Opens the keyboard connect picker when exactly one node is selected (R13). */
export function openConnect(api: DesignStore, ui: UiStore): void {
  if (api.getState().selection.nodes.length === 1) ui.getState().set({ connectOpen: true });
}

/** Selects a node and moves focus to the inspector's first control. */
export function inspectNode(api: DesignStore, ui: UiStore, id: string): void {
  api.getState().select({ nodes: [id], edges: [], groups: [] });
  ui.getState().focusInspector();
}

const layingOut = new WeakSet<DesignStore>();

/**
 * ELK layout of the whole design as one history step; frames are refitted around their members.
 * One layout at a time per store, and a result for a design that changed meanwhile is dropped.
 * Resolves true when the layout was applied; rejects if ELK fails (callers show a toast).
 */
export async function autoLayout(api: DesignStore): Promise<boolean> {
  if (layingOut.has(api)) return false;
  layingOut.add(api);
  try {
    const start = api.getState().design;
    const positions = await layoutPositions(start);
    if (api.getState().design !== start) return false;
    api.getState().apply((d) => fitGroups(moveNodes(d, positions)));
    return true;
  } finally {
    layingOut.delete(api);
  }
}

export function groupSelection(api: DesignStore): void {
  const r = groupNodes(api.getState().design, api.getState().selection.nodes);
  if (!r) return;
  api.getState().apply(() => r.design);
  api.getState().select({ nodes: [], edges: [], groups: [r.id] });
}

/** Ungroups the selected frames and the frames of the selected nodes. */
export function ungroupSelection(api: DesignStore): void {
  const { selection, design } = api.getState();
  const groups = new Set([...selection.groups, ...design.nodes.filter((n) => selection.nodes.includes(n.id)).map((n) => n.groupId)]);
  api.getState().apply((d) => [...groups].reduce((acc, g) => (g ? ungroup(acc, g) : acc), d));
}
