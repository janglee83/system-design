import type { ComponentMeta } from "@sd/sim";
import { connect, copyItems, deleteItems, duplicateItems, pasteItems, type ConnectRefusal } from "./model/ops";
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

/** How many times the current clipboard was pasted; each paste lands 32 px further away. */
let pasteCount = 0;

export function copySelection(api: DesignStore): void {
  const { design, selection } = api.getState();
  if (selection.nodes.length === 0) return;
  const clip = copyItems(design, selection.nodes);
  api.getState().setClipboard(clip);
  pasteCount = 0;
  void navigator.clipboard?.writeText(JSON.stringify({ sdLabClipboard: 1, ...clip })).catch(() => {});
}

export function pasteClipboard(api: DesignStore): void {
  const clip = api.getState().clipboard;
  if (!clip) return;
  pasteCount += 1;
  let ids: string[] = [];
  api.getState().apply((d) => {
    const r = pasteItems(d, clip, { x: 32 * pasteCount, y: 32 * pasteCount });
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
