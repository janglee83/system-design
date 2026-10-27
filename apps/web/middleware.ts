import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

// Everything except Next internals and files with an extension (wasm, fonts, images).
export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
