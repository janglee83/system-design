// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
  it("reads the preference the head script applied", () => {
    localStorage.clear();
    document.documentElement.dataset.themePref = "dark";
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("dark");
  });
});
