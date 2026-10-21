import type { CalibrationOverrides, ConfigValue, EdgeKind, Fault, GraphLimits, Workload } from "@sd/sim";

export const DESIGN_FORMAT_VERSION = 1 as const;
/** Layout size of a node card (R14). */
export const NODE_SIZE = { width: 184, height: 76 } as const;

export interface XY {
  x: number;
  y: number;
}

export interface LabNode {
  id: string;
  kind: string;
  /** "" means "show the translated component name plus its number" (R12). */
  label: string;
  replicas: number;
  config: Record<string, ConfigValue>;
  /** Absolute canvas position (R12), even for group members. */
  position: XY;
  groupId: string | null;
}

export interface LabEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
}

/** UI-only frame; never sent to the engine (R15). */
export interface LabGroup {
  id: string;
  label: string;
  position: XY;
  size: { width: number; height: number };
}

export interface ChallengeRef {
  id: string;
  mode: string;
  limits: GraphLimits;
}

export interface Design {
  designFormatVersion: typeof DESIGN_FORMAT_VERSION;
  name: string;
  nodes: LabNode[];
  edges: LabEdge[];
  groups: LabGroup[];
  workload: Workload;
  faults: Fault[];
  /** Only the world parameters the user changed (R11, Review Focus 4). */
  calibration: CalibrationOverrides;
  durationMs: number;
  seed: number;
  /** Node ids a challenge locks (R12). */
  locked: string[];
  challenge: ChallengeRef | null;
}

export function defaultWorkload(): Workload {
  return { profile: "mixed", baseRps: 1000, writeRatio: 0.2, clients: 1000, clientTimeoutMs: 1000, surge: null, params: {} };
}

export function emptyDesign(name = ""): Design {
  return {
    designFormatVersion: DESIGN_FORMAT_VERSION,
    name,
    nodes: [],
    edges: [],
    groups: [],
    workload: defaultWorkload(),
    faults: [],
    calibration: {},
    durationMs: 10_000,
    seed: 1,
    locked: [],
    challenge: null,
  };
}
