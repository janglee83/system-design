import { createStore } from "zustand/vanilla";
import { advance, SPEEDS } from "../run/clock";

export interface PlaybackState {
  timeMs: number;
  playing: boolean;
  speed: number;
  durationMs: number;
  /** Moves the playhead, clamped to the run. */
  seek(ms: number): void;
  /** A new run: paused at 0 s (R18). */
  reset(durationMs: number): void;
  /** Plays from here, or from 0 when at the end. */
  play(): void;
  pause(): void;
  toggle(): void;
  /** One of SPEEDS; anything else is ignored. */
  setSpeed(speed: number): void;
  /** Advances by real milliseconds while playing. */
  tick(realDtMs: number): void;
}

export function createPlaybackStore() {
  return createStore<PlaybackState>()((set, get) => ({
    timeMs: 0,
    playing: false,
    speed: 1,
    durationMs: 0,
    seek: (ms) => set({ timeMs: Math.min(get().durationMs, Math.max(0, ms)) }),
    reset: (durationMs) => set({ timeMs: 0, playing: false, durationMs }),
    play() {
      const s = get();
      if (s.durationMs <= 0) return;
      set({ playing: true, timeMs: s.timeMs >= s.durationMs ? 0 : s.timeMs });
    },
    pause: () => set({ playing: false }),
    toggle() {
      if (get().playing) get().pause();
      else get().play();
    },
    setSpeed(speed) {
      if ((SPEEDS as readonly number[]).includes(speed)) set({ speed });
    },
    tick(realDtMs) {
      const s = get();
      if (s.playing) set(advance(s, realDtMs));
    },
  }));
}

export type PlaybackStore = ReturnType<typeof createPlaybackStore>;
