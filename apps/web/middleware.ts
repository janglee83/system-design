import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { pageCsp } from "./src/security/csp";

const intl = createMiddleware(routing);

/** Locale routing, plus a per-request CSP nonce that Next.js puts on its own scripts (Phase 1 review M11). */
export default function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = pageCsp(nonce, process.env.NODE_ENV === "development");
  // Next.js reads the nonce from the request's CSP header; the theme head script reads x-nonce.
  request.headers.set("content-security-policy", csp);
  request.headers.set("x-nonce", nonce);
  const response = intl(request);
  response.headers.set("Content-Security-Policy", csp);
  // next-intl forwards the request headers when it rewrites; make sure ours are forwarded too.
  if (!response.headers.get("location")) {
    const forwarded = NextResponse.next({ request: { headers: request.headers } });
    forwarded.headers.forEach((v, k) => {
      if (k === "x-middleware-override-headers" || k.startsWith("x-middleware-request-")) response.headers.set(k, v);
    });
  }
  return response;
}

// Everything except Next internals and files with an extension (wasm, fonts, images).
export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
