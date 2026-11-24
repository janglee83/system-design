import { describe, expect, it } from "vitest";
import { localeCookie } from "./locale-cookie";

describe("locale cookie", () => {
  it("uses the routing cookie settings, and is Secure on https only (review)", () => {
    const year = 60 * 60 * 24 * 365;
    expect(localeCookie("vi", "http:")).toBe(`NEXT_LOCALE=vi; path=/; max-age=${year}; samesite=lax`);
    expect(localeCookie("en", "https:")).toBe(`NEXT_LOCALE=en; path=/; max-age=${year}; samesite=lax; secure`);
  });
});
