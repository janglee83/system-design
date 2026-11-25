import type { ComponentMeta } from "@sd/sim";
import { emptyDesign, type Design } from "./design";
import { addNode, connect } from "./ops";

/** Starting designs offered by "New" and `?template=` (R12; Design v2 adds the challenge start). */
export const TEMPLATES = ["empty", "webDb"] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export function designFromTemplate(id: TemplateId, metas: ReadonlyMap<string, ComponentMeta>): Design {
  let d = emptyDesign();
  if (id === "empty") return d;
  const place = (kind: string, x: number) => {
    const meta = metas.get(kind);
    if (meta) d = addNode(d, meta, { x, y: 64 }).design;
  };
  // 172 px tiles with 160 px between them: room for an edge's traffic pill.
  place("client", 64);
  place("web-server", 400);
  place("postgres", 736);
  for (const [from, to] of [["client-1", "web-server-1"], ["web-server-1", "postgres-1"]] as const) {
    d = connect(d, from, to, metas).design;
  }
  return d;
}
