import { createStore } from "zustand/vanilla";

export type BottomTab = "metrics" | "events" | "logs" | "simulation";

export interface UiState {
  snap: boolean;
  panelHeight: number;
  bottomTab: BottomTab;
  connectOpen: boolean;
  /** The saved-designs dialog. */
  designsOpen: boolean;
  /** The name prompt for a first save or a save-as. */
  saveDialog: "save" | "saveAs" | null;
  /** The viewer's minimap choice, or null to show it automatically for large designs (owner override 2026-11-19). */
  minimapChoice: boolean | null;
  /** The last design was looked for (and restored if there was one): the boot card's last step. */
  draftChecked: boolean;
  /** The engine error card was put aside to edit the design while the engine is down. */
  errorDismissed: boolean;
  /** Incremented to ask the inspector to focus its first control (Enter on a node). */
  inspectorFocusTick: number;
  set(patch: Partial<Omit<UiState, "set" | "focusInspector">>): void;
  focusInspector(): void;
}

export function createUiStore() {
  return createStore<UiState>()((set, get) => ({
    snap: true,
    panelHeight: 260,
    bottomTab: "metrics",
    connectOpen: false,
    designsOpen: false,
    saveDialog: null,
    inspectorFocusTick: 0,
    draftChecked: false,
    minimapChoice: null,
    errorDismissed: false,
    set: (patch) => set(patch),
    focusInspector: () => set({ inspectorFocusTick: get().inspectorFocusTick + 1 }),
  }));
}

export type UiStore = ReturnType<typeof createUiStore>;
