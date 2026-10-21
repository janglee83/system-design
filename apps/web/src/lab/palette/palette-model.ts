import type { ComponentMeta } from "@sd/sim";
import type { Translate } from "../labels";
import { fold } from "../model/fold";

const CATEGORY_ORDER = ["general", "compute", "data"];

export interface PaletteItem {
  kind: string;
  name: string;
  description: string;
  allowed: boolean;
}

export function paletteGroups(
  metas: readonly ComponentMeta[],
  opts: { query: string; t: Translate; allowedKinds?: readonly string[] | null },
): { category: string; items: PaletteItem[] }[] {
  const q = fold(opts.query.trim());
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i < 0 ? CATEGORY_ORDER.length : i;
  };
  const byCat = new Map<string, PaletteItem[]>();
  for (const m of metas) {
    const name = opts.t(m.labelKey);
    const description = opts.t(`componentDescription.${m.kind}`);
    if (q && !fold(`${name} ${description} ${m.kind}`).includes(q)) continue;
    const items = byCat.get(m.category) ?? [];
    items.push({ kind: m.kind, name, description, allowed: !opts.allowedKinds || opts.allowedKinds.includes(m.kind) });
    byCat.set(m.category, items);
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}
