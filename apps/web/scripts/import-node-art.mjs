// Copies the node illustrations from the design assets into the app, byte for byte.
// The art is generated from docs/design/demos/shared/art.js; never edit the copies by hand.
// Run after the design assets change: pnpm --filter @sd/web art:import
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ART_SOURCE = path.resolve(web, "../../docs/design/assets/nodes");
export const ART_TARGET = path.resolve(web, "src/lab/canvas/art");
export const ART_FILES = ["NodeArt.tsx", "manifest.json"];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(ART_TARGET, { recursive: true });
  for (const f of ART_FILES) fs.copyFileSync(path.join(ART_SOURCE, f), path.join(ART_TARGET, f));
  console.log(`node art: copied ${ART_FILES.join(", ")} to ${path.relative(web, ART_TARGET)}`);
}
