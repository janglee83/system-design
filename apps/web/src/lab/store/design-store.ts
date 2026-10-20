import { createStore } from "zustand/vanilla";
import { emptyDesign, type Design } from "../model/design";
import type { Clipboard } from "../model/ops";

/** R16: at least 100 steps (spec); we keep 200. */
export const HISTORY_LIMIT = 200;

export interface Selection {
  nodes: string[];
  edges: string[];
  groups: string[];
}
const NONE: Selection = { nodes: [], edges: [], groups: [] };

/** Repeated small edits with the same key within this window are one history step (arrow-key nudges). */
export const COALESCE_MS = 500;

export interface ApplyOptions {
  coalesce?: string;
  /** Clock for tests; defaults to Date.now(). */
  now?: number;
}

export interface DesignState {
  design: Design;
  past: Design[];
  future: Design[];
  selection: Selection;
  clipboard: Clipboard | null;
  /** Pastes of the current clipboard; each lands 32 px further away. */
  pastes: number;
  /** Incremented by replace() (open, import, start from a challenge): the canvas fits the view. */
  loads: number;
  apply(fn: (d: Design) => Design, opts?: ApplyOptions): void;
  replace(d: Design): void;
  undo(): void;
  redo(): void;
  select(sel: Partial<Selection>): void;
  clearSelection(): void;
  setClipboard(clip: Clipboard | null): void;
  /** Counts a paste and returns how many there have been for this clipboard. */
  countPaste(): number;
}

function prune(sel: Selection, d: Design): Selection {
  const nodes = new Set(d.nodes.map((n) => n.id));
  const edges = new Set(d.edges.map((e) => e.id));
  const groups = new Set(d.groups.map((g) => g.id));
  const next = {
    nodes: sel.nodes.filter((id) => nodes.has(id)),
    edges: sel.edges.filter((id) => edges.has(id)),
    groups: sel.groups.filter((id) => groups.has(id)),
  };
  return next.nodes.length === sel.nodes.length && next.edges.length === sel.edges.length && next.groups.length === sel.groups.length
    ? sel
    : next;
}

export function createDesignStore(initial: Design = emptyDesign()) {
  let last: { key: string; at: number } | null = null;
  return createStore<DesignState>()((set, get) => ({
    design: initial,
    past: [],
    future: [],
    selection: NONE,
    clipboard: null,
    pastes: 0,
    loads: 0,
    apply(fn, opts) {
      const { design, past, selection } = get();
      const next = fn(design);
      if (next === design) return;
      const now = opts?.now ?? Date.now();
      const key = opts?.coalesce;
      const merge = key !== undefined && last !== null && last.key === key && now - last.at < COALESCE_MS && past.length > 0;
      last = key === undefined ? null : { key, at: now };
      set({
        design: next,
        // A merged step keeps the snapshot from before the first nudge.
        past: merge ? past : [...past, design].slice(-HISTORY_LIMIT),
        future: [],
        selection: prune(selection, next),
      });
    },
    replace(d) {
      last = null;
      set({ design: d, past: [], future: [], selection: NONE, loads: get().loads + 1 });
    },
    undo() {
      last = null;
      const { design, past, future, selection } = get();
      const prev = past.at(-1);
      if (!prev) return;
      set({ design: prev, past: past.slice(0, -1), future: [design, ...future], selection: prune(selection, prev) });
    },
    redo() {
      last = null;
      const { design, past, future, selection } = get();
      const next = future[0];
      if (!next) return;
      set({ design: next, past: [...past, design], future: future.slice(1), selection: prune(selection, next) });
    },
    select(sel) {
      set({ selection: { ...get().selection, ...sel } });
    },
    clearSelection() {
      set({ selection: NONE });
    },
    setClipboard(clip) {
      set({ clipboard: clip, pastes: 0 });
    },
    countPaste() {
      const pastes = get().pastes + 1;
      set({ pastes });
      return pastes;
    },
  }));
}

export type DesignStore = ReturnType<typeof createDesignStore>;
