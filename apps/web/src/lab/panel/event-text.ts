import type { ComponentMeta, SimEvent } from "@sd/sim";
import { displayLabel, type Translate } from "../labels";
import type { Design } from "../model/design";

// Bivariant translator (see labels.ts), with next-intl's optional has().
type T = Translate & { has?(key: string): boolean };

const LEVELS: Record<string, "info" | "warn" | "error"> = {
  "db.no-replica": "error",
  "db.primary-down": "error",
  "db.promoted": "info",
  "fault.no-target": "warn",
  "fault.traffic-surge": "warn",
  "fault.unsupported": "warn",
  "instance.down": "error",
  "lb.node-down": "error",
  "node.overloaded": "warn",
};
export const eventLevel = (code: string): "info" | "warn" | "error" => LEVELS[code] ?? "info";

export function eventText(e: SimEvent, ctx: { design: Design; metas: ReadonlyMap<string, ComponentMeta>; t: T }): string {
  const key = `engine.event.${e.code}`;
  if (ctx.t.has && !ctx.t.has(key)) return e.code;
  const n = e.node ? ctx.design.nodes.find((x) => x.id === e.node) : undefined;
  const node = n ? displayLabel(n, ctx.metas.get(n.kind) ?? null, ctx.t) : (e.node ?? "");
  const params: Record<string, number> = {};
  for (const [k, v] of Object.entries(e.params)) if (typeof v === "number") params[k] = v;
  return ctx.t(key, { node, ...params });
}
