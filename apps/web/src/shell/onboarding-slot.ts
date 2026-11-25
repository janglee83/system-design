import { create } from "zustand";

/**
 * Where the first-run checklist renders until the first run: the results panel's empty area,
 * where it covers nothing on the canvas (QA). Null: its usual corner of the canvas.
 */
export const useOnboardingSlot = create<{ slot: HTMLElement | null; setSlot(el: HTMLElement | null): void }>()((set) => ({
  slot: null,
  setSlot: (slot) => set({ slot }),
}));
