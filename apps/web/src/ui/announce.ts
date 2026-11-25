import { create } from "zustand";

/** One polite screen-reader message at a time (no visible toast). */
export const useAnnouncer = create<{ message: string; n: number }>()(() => ({ message: "", n: 0 }));
export const announce = (message: string) => useAnnouncer.setState((s) => ({ message, n: s.n + 1 }));
