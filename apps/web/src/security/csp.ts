/** Security headers (Phase 1 review M11). Pure, so the middleware and next.config share them. */

/** The policy for HTML pages: Next.js's own inline scripts and the theme head script carry the nonce. */
export function pageCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced scripts load Next's chunks; 'wasm-unsafe-eval' compiles the engine.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "worker-src 'self'",
    // React Flow and Radix position things with inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The engine worker's script gets its policy from its own response. */
export function workerCsp(): string {
  return ["default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "connect-src 'self'", "object-src 'none'"].join("; ");
}

const OFF = ["accelerometer", "autoplay", "camera", "display-capture", "geolocation", "gyroscope", "microphone", "midi", "payment", "usb", "interest-cohort"];

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: OFF.map((f) => `${f}=()`).join(", ") },
];
