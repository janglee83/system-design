import { createStore } from "zustand/vanilla";

export type BottomTab = "metrics" | "events" | "logs" | "simulation";

export interface UiState {
  snap: boolean;
  minimap: boolean;
  panelHeight: number;
  bottomTab: BottomTab;
  connectOpen: boolean;
  /** The saved-designs dialog. */
  designsOpen: boolean;
  /** The name prompt for a first save or a save-as. */
  saveDialog: "save" | "saveAs" | null;
  /** Incremented to ask the inspector to focus its first control (Enter on a node). */
  inspectorFocusTick: number;
  set(patch: Partial<Omit<UiState, "set" | "focusInspector">>): void;
  focusInspector(): void;
}

export function createUiStore() {
  return createStore<UiState>()((set, get) => ({
    snap: true,
    minimap: true,
    panelHeight: 260,
    bottomTab: "metrics",
    connectOpen: false,
    designsOpen: false,
    saveDialog: null,
    inspectorFocusTick: 0,
    set: (patch) => set(patch),
    focusInspector: () => set({ inspectorFocusTick: get().inspectorFocusTick + 1 }),
  }));
}

export type UiStore = ReturnType<typeof createUiStore>;
