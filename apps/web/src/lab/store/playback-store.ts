import { createStore } from "zustand/vanilla";

export interface PlaybackState {
  timeMs: number;
  playing: boolean;
  speed: number;
  durationMs: number;
  /** Moves the playhead, clamped to the run. */
  seek(ms: number): void;
  /** A new run: paused at 0 s (R18). */
  reset(durationMs: number): void;
}

export function createPlaybackStore() {
  return createStore<PlaybackState>()((set, get) => ({
    timeMs: 0,
    playing: false,
    speed: 1,
    durationMs: 0,
    seek: (ms) => set({ timeMs: Math.min(get().durationMs, Math.max(0, ms)) }),
    reset: (durationMs) => set({ timeMs: 0, playing: false, durationMs }),
  }));
}

export type PlaybackStore = ReturnType<typeof createPlaybackStore>;
