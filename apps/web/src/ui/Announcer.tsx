"use client";
import { useAnnouncer } from "./announce";

/** Visually hidden live region for `announce()`. Mounted once by the shell. */
export function Announcer() {
  const { message, n } = useAnnouncer();
  return (
    <div data-testid="announcer" aria-live="polite" role="status" className="sr-only">
      {/* Keyed by count, so the same message twice is announced twice. */}
      <span key={n}>{message}</span>
    </div>
  );
}
