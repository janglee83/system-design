"use client";
import { useLayoutEffect } from "react";
import { applyTheme, readPref } from "./theme";

/**
 * Puts the stored theme back on <html> when the locale layout mounts. The head script runs only on
 * a full page load; a client-side language switch re-renders <html> without its theme attributes.
 */
export function ThemeKeeper() {
  useLayoutEffect(() => {
    let pref: ReturnType<typeof readPref> = "system";
    try {
      pref = readPref(window.localStorage);
    } catch {
      // storage blocked: follow the system
    }
    applyTheme(pref);
  }, []);
  return null;
}
