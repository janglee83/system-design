import { sim } from "@sd/sim/node";
import type { ComponentMeta } from "@sd/sim";

export const METAS: ComponentMeta[] = sim.listComponents();
export const META_BY_KIND: ReadonlyMap<string, ComponentMeta> = new Map(METAS.map((m) => [m.kind, m]));
export const meta = (kind: string): ComponentMeta => {
  const m = META_BY_KIND.get(kind);
  if (!m) throw new Error(`no component ${kind}`);
  return m;
};
