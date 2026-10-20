"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { applyTheme, readPref, THEME_KEY, type ThemePref } from "./theme";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getPref(): ThemePref {
  try {
    return readPref(localStorage);
  } catch {
    return "system";
  }
}

/** Current preference; follows OS changes live while the preference is "system". */
export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, getPref, () => "system" as ThemePref);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const set = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(THEME_KEY, p);
    } catch {
      /* storage unavailable: still apply for this page */
    }
    applyTheme(p);
    notify();
  }, []);

  return [pref, set];
}
