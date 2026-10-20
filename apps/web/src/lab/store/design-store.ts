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

export interface DesignState {
  design: Design;
  past: Design[];
  future: Design[];
  selection: Selection;
  clipboard: Clipboard | null;
  /** Incremented by replace() (open, import, start from a challenge): the canvas fits the view. */
  loads: number;
  apply(fn: (d: Design) => Design): void;
  replace(d: Design): void;
  undo(): void;
  redo(): void;
  select(sel: Partial<Selection>): void;
  clearSelection(): void;
  setClipboard(clip: Clipboard | null): void;
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
  return createStore<DesignState>()((set, get) => ({
    design: initial,
    past: [],
    future: [],
    selection: NONE,
    clipboard: null,
    loads: 0,
    apply(fn) {
      const { design, past, selection } = get();
      const next = fn(design);
      if (next === design) return;
      set({ design: next, past: [...past, design].slice(-HISTORY_LIMIT), future: [], selection: prune(selection, next) });
    },
    replace(d) {
      set({ design: d, past: [], future: [], selection: NONE, loads: get().loads + 1 });
    },
    undo() {
      const { design, past, future, selection } = get();
      const prev = past.at(-1);
      if (!prev) return;
      set({ design: prev, past: past.slice(0, -1), future: [design, ...future], selection: prune(selection, prev) });
    },
    redo() {
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
      set({ clipboard: clip });
    },
  }));
}

export type DesignStore = ReturnType<typeof createDesignStore>;
