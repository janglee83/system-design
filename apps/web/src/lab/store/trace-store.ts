import type { Trace } from "@sd/sim";
import { createStore } from "zustand/vanilla";

/** The request being followed (design-system §7.4), and which hop is highlighted. */
export interface TraceState {
  runId: number | null;
  trace: Trace | null;
  hop: number;
  pick(runId: number, trace: Trace): void;
  setHop(i: number): void;
  clear(): void;
}

export function createTraceStore() {
  return createStore<TraceState>()((set, get) => ({
    runId: null,
    trace: null,
    hop: 0,
    pick: (runId, trace) => set({ runId, trace, hop: 0 }),
    setHop: (i) => {
      const n = get().trace?.steps.length ?? 0;
      if (n > 0) set({ hop: Math.min(n - 1, Math.max(0, i)) });
    },
    clear: () => set({ runId: null, trace: null, hop: 0 }),
  }));
}

export type TraceStore = ReturnType<typeof createTraceStore>;
