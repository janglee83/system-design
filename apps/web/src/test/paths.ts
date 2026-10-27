import path from "node:path";
import { fileURLToPath } from "node:url";

/** apps/web */
export const appRoot = fileURLToPath(new URL("../../", import.meta.url));
/** repository root */
export const repoRoot = path.resolve(appRoot, "../..");
