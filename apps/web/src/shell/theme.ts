export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export const THEME_KEY = "sd-theme";
export const THEME_PREFS: readonly ThemePref[] = ["light", "dark", "system"];

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

export function readPref(storage: Pick<Storage, "getItem">): ThemePref {
  const v = storage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

/** Runs in <head> before first paint (plan ruling R26). Keep it dependency-free. */
export const themeScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.dataset.themePref=p;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export function applyTheme(pref: ThemePref): void {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(pref, systemDark);
  root.dataset.themePref = pref;
}
