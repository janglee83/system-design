/** The playback speeds of R19. */
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export interface ClockState {
  timeMs: number;
  playing: boolean;
  speed: number;
  durationMs: number;
}

/** One step of the playback clock: real time times speed, stopping at the end. */
export function advance(s: ClockState, realDtMs: number): { timeMs: number; playing: boolean } {
  if (!s.playing) return { timeMs: s.timeMs, playing: false };
  const t = s.timeMs + realDtMs * s.speed;
  return t >= s.durationMs ? { timeMs: s.durationMs, playing: false } : { timeMs: t, playing: true };
}

/** The timeline frame shown at a time (R19: floor(t / frameMs)), clamped to the last frame. */
export function frameAt(timeMs: number, frameMs: number, frames: number): number {
  if (frames <= 0) return 0;
  return Math.min(frames - 1, Math.max(0, Math.floor(timeMs / frameMs)));
}

/** "00:04,2": minutes, seconds and tenths, with the locale's decimal mark (design-system §7.2). */
export function formatClock(ms: number, locale: string): string {
  const tenths = Math.floor(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor((tenths % 600) / 10);
  const mark = new Intl.NumberFormat(locale).format(1.5).charAt(1);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${mark}${tenths % 10}`;
}
