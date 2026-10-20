// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { readPref, resolveTheme, THEME_KEY, themeScript } from "./theme";

describe("theme", () => {
  it("resolves system against the OS setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("reads only known preferences", () => {
    expect(readPref({ getItem: () => "dark" })).toBe("dark");
    expect(readPref({ getItem: () => "purple" })).toBe("system");
    expect(readPref({ getItem: () => null })).toBe("system");
  });

  it("the head script applies the stored preference before paint", () => {
    localStorage.setItem(THEME_KEY, "dark");
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
    new Function(themeScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePref).toBe("dark");
  });
});

describe("theme script fallback", () => {
  it("follows the OS setting when storage is unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    window.matchMedia = () => ({ matches: true }) as MediaQueryList;
    delete document.documentElement.dataset.theme;
    new Function(themeScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
    getItem.mockRestore();
  });
});
