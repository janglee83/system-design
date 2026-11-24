import { describe, expect, it } from "vitest";
import { pageCsp, SECURITY_HEADERS, workerCsp } from "./csp";

describe("content security policy (Phase 1 review M11)", () => {
  it("allows only this origin, the page's nonce, and WebAssembly; no frames, no plugins", () => {
    const csp = pageCsp("abc123", false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic' 'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain(" 'unsafe-eval'"); // only 'wasm-unsafe-eval' in production
  });
  it("lets the dev server evaluate code (React refresh) only in development", () => {
    expect(pageCsp("n", true)).toContain("'unsafe-eval'");
  });
  it("gives the engine worker its own policy", () => {
    expect(workerCsp()).toContain("script-src 'self' 'wasm-unsafe-eval'");
  });
  it("sets the usual hardening headers", () => {
    const h = Object.fromEntries(SECURITY_HEADERS.map((x) => [x.key, x.value]));
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    expect(h["X-Frame-Options"]).toBe("DENY");
  });
});
