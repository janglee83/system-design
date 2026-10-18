import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SimInput } from "../src/types";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const goldenDir = path.join(repoRoot, "fixtures/golden");

export function goldenFiles(): string[] {
  return fs.readdirSync(goldenDir).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(goldenDir, f));
}

export function webTier(lb: number, web: number, baseRps: number): SimInput {
  return {
    graph: {
      nodes: [
        { id: "users", kind: "client", label: "", replicas: 1, config: {} },
        { id: "lb", kind: "lb", label: "", replicas: lb, config: {} },
        { id: "web", kind: "web-server", label: "", replicas: web, config: {} },
      ],
      edges: [
        { id: "e1", from: "users", to: "lb", kind: "http" },
        { id: "e2", from: "lb", to: "web", kind: "http" },
      ],
    },
    workload: { profile: "mixed", baseRps, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} },
    faults: [],
    durationMs: 10000,
    seed: 1,
  };
}
