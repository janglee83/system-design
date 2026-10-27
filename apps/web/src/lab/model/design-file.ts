import { z } from "zod";
import { ALL_FAULT_KINDS, ARRIVALS, EDGE_KINDS, PROFILES } from "@/i18n/engine-codes";
import { DESIGN_FORMAT_VERSION, type Design } from "./design";

export const DESIGN_FILE_LIMITS = { nodes: 500, edges: 2000, groups: 100, faults: 100, params: 50, text: 200 } as const;

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/);
const key = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/); // never "__proto__"
const num = z.number().finite();
const text = z.string().max(DESIGN_FILE_LIMITS.text);
const xy = z.strictObject({ x: num, y: num });
const configValue = z.union([num, z.boolean(), z.string().max(64)]);

const workload = z.strictObject({
  profile: z.enum(PROFILES),
  baseRps: num.min(0),
  writeRatio: num.min(0).max(1),
  clients: z.number().int().min(1),
  clientTimeoutMs: num.positive(),
  surge: z.strictObject({ factor: num.min(0), atMs: z.number().int().min(0), durationMs: z.number().int().min(0) }).nullable(),
  params: z.record(key, num).refine((r) => Object.keys(r).length <= DESIGN_FILE_LIMITS.params, { params: { code: "too_big" } }),
  trafficEndMs: z.number().int().min(0).optional(),
  arrivals: z.enum(ARRIVALS).optional(),
});

const calibrationKeys = [
  "webRpsPerVcpu", "webServiceMs", "webQueuePerGb", "webCostPerVcpu", "webCostPerExtraVcpu",
  "lbRpsPerReplica", "lbServiceMs", "lbQueueSeconds", "lbCostPerReplica", "lbMaxUtilizationForLatency",
  "pgQpsPerInstance", "pgServiceMs", "pgQueueSeconds", "pgCostPerInstance", "pgFailoverMs", "pgMaxUtilizationForLatency",
  "edgeDelayHttpMs", "edgeDelayDbMs", "edgeDelayCacheMs", "edgeDelayMsgMs",
] as const;

const schema = z.strictObject({
  designFormatVersion: z.literal(DESIGN_FORMAT_VERSION),
  engineVersion: z.string().max(32).optional(),
  name: text,
  nodes: z
    .array(
      z.strictObject({
        id,
        kind: z.string().regex(/^[a-z0-9-]{1,40}$/),
        label: text,
        replicas: z.number().int().min(1).max(1000),
        config: z.record(key, configValue),
        position: xy,
        groupId: id.nullable(),
      }),
    )
    .max(DESIGN_FILE_LIMITS.nodes),
  edges: z.array(z.strictObject({ id, from: id, to: id, kind: z.enum(EDGE_KINDS) })).max(DESIGN_FILE_LIMITS.edges),
  groups: z
    .array(z.strictObject({ id, label: text, position: xy, size: z.strictObject({ width: num.positive(), height: num.positive() }) }))
    .max(DESIGN_FILE_LIMITS.groups),
  workload,
  faults: z.array(z.strictObject({ kind: z.enum(ALL_FAULT_KINDS), target: id.nullable(), atMs: z.number().int().min(0) })).max(DESIGN_FILE_LIMITS.faults),
  calibration: z.strictObject(Object.fromEntries(calibrationKeys.map((k) => [k, num.optional()])) as Record<(typeof calibrationKeys)[number], z.ZodOptional<z.ZodNumber>>),
  durationMs: z.number().int().min(1).max(600_000),
  seed: z.number().int().min(0).max(4294967295),
  locked: z.array(id).max(DESIGN_FILE_LIMITS.nodes),
  challenge: z
    .strictObject({
      id: z.string().regex(/^c-[a-z0-9-]+$/),
      mode: z.string().regex(/^[a-z0-9-]{2,40}$/),
      limits: z.strictObject({
        maxNodes: z.number().int().min(1).nullable(),
        maxInstances: z.number().int().min(1).nullable(),
        allowedKinds: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(100).nullable(),
      }),
    })
    .nullable(),
});

export type FileIssue = { path: string; code: string };

function references(d: Design): FileIssue[] {
  const out: FileIssue[] = [];
  const nodeIds = new Set<string>();
  d.nodes.forEach((n, i) => {
    if (nodeIds.has(n.id)) out.push({ path: `nodes.${i}.id`, code: "duplicate_id" });
    nodeIds.add(n.id);
  });
  const groupIds = new Set(d.groups.map((g) => g.id));
  const edgeIds = new Set<string>();
  d.edges.forEach((e, i) => {
    if (edgeIds.has(e.id)) out.push({ path: `edges.${i}.id`, code: "duplicate_id" });
    edgeIds.add(e.id);
    if (!nodeIds.has(e.from)) out.push({ path: `edges.${i}.from`, code: "dangling_ref" });
    if (!nodeIds.has(e.to)) out.push({ path: `edges.${i}.to`, code: "dangling_ref" });
  });
  d.nodes.forEach((n, i) => n.groupId !== null && !groupIds.has(n.groupId) && out.push({ path: `nodes.${i}.groupId`, code: "dangling_ref" }));
  d.locked.forEach((l, i) => !nodeIds.has(l) && out.push({ path: `locked.${i}`, code: "dangling_ref" }));
  d.faults.forEach((f, i) => f.target !== null && !nodeIds.has(f.target) && out.push({ path: `faults.${i}.target`, code: "dangling_ref" }));
  return out;
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * The path of the first key anywhere in the document that could reach an object prototype.
 * JSON.parse keeps "__proto__" as an own key; refusing it outright is safer than relying on how
 * a validator copies records (Review Focus 7).
 */
function forbiddenKey(v: unknown, path: string[]): string | null {
  if (v === null || typeof v !== "object") return null;
  for (const [k, child] of Object.entries(v)) {
    if (FORBIDDEN_KEYS.has(k)) return [...path, k].join(".");
    const found = forbiddenKey(child, [...path, k]);
    if (found) return found;
  }
  return null;
}

export function parseDesignFile(textIn: string): { ok: true; design: Design } | { ok: false; issues: FileIssue[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(textIn);
  } catch {
    return { ok: false, issues: [{ path: "", code: "invalid_json" }] };
  }
  if (raw && typeof raw === "object" && "designFormatVersion" in raw && (raw as { designFormatVersion: unknown }).designFormatVersion !== DESIGN_FORMAT_VERSION) {
    return { ok: false, issues: [{ path: "designFormatVersion", code: "unsupported_version" }] };
  }
  const forbidden = forbiddenKey(raw, []);
  if (forbidden) return { ok: false, issues: [{ path: forbidden, code: "invalid_key" }] };
  const r = schema.safeParse(raw);
  if (!r.success) {
    return {
      ok: false,
      issues: r.error.issues.map((i) => ({
        path: i.path.join("."),
        // Our refinements carry their own code (too_big for params); zod's otherwise.
        code: (i as { params?: { code?: string } }).params?.code ?? i.code,
      })),
    };
  }
  // engineVersion is informational (R23); it is not part of the design.
  const design: Partial<typeof r.data> = { ...r.data };
  delete design.engineVersion;
  const refs = references(design as Design);
  return refs.length ? { ok: false, issues: refs } : { ok: true, design: design as Design };
}

const slug = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "design";

export function exportDesign(d: Design, engineVersion: string): { filename: string; text: string } {
  const { designFormatVersion, ...rest } = d;
  return { filename: `${slug(d.name)}.sdlab.json`, text: `${JSON.stringify({ designFormatVersion, engineVersion, ...rest }, null, 2)}\n` };
}
