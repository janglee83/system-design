import type { ComponentMeta } from "@sd/sim";
import { KINDS, categoryOf, type Category, type KindStatus } from "../canvas/kinds";
import type { Translate } from "../labels";
import { fold } from "../model/fold";

/** The rail's seven categories, in order (design-system §3). */
export const CATEGORIES: readonly Category[] = ["entry", "compute", "data", "cache", "msg", "storage", "external"];

export interface CatalogItem {
  kind: string;
  category: Category;
  /** ready: the engine has it; planned: next engine work (curriculum.json); later: drawn only. */
  status: KindStatus;
  name: string;
  description: string;
  /** False when the open challenge does not allow this kind. */
  allowed: boolean;
  meta: ComponentMeta | null;
}

/**
 * One catalogue of every kind: the engine's components (ready), the curriculum's planned list,
 * and the rest of the drawn kinds (later). Ordered as the design assets list them.
 */
export function buildCatalog(opts: {
  metas: readonly ComponentMeta[];
  planned: readonly string[];
  t: Translate;
  allowedKinds?: readonly string[] | null;
}): CatalogItem[] {
  const byKind = new Map(opts.metas.map((m) => [m.kind, m]));
  const kinds = [...KINDS.keys(), ...opts.metas.map((m) => m.kind).filter((k) => !KINDS.has(k))];
  return kinds.map((kind) => {
    const meta = byKind.get(kind) ?? null;
    const status: KindStatus = meta ? "ready" : opts.planned.includes(kind) ? "planned" : "later";
    return {
      kind,
      category: categoryOf(kind),
      status,
      name: opts.t(meta ? meta.labelKey : `component.${kind}`),
      description: opts.t(`componentDescription.${kind}`),
      allowed: !opts.allowedKinds || opts.allowedKinds.includes(kind),
      meta,
    };
  });
}

const RANK: Record<KindStatus, number> = { ready: 0, planned: 1, later: 2 };

/** A category's kinds, ready ones first (stable otherwise). */
export function categoryItems(items: readonly CatalogItem[], category: Category): CatalogItem[] {
  return items.filter((i) => i.category === category).sort((a, b) => RANK[a.status] - RANK[b.status]);
}

/** Searches every category by name, description or kind, ignoring accents. */
export function searchCatalog(items: readonly CatalogItem[], query: string): { category: Category; items: CatalogItem[] }[] {
  const q = fold(query.trim());
  const hits = items.filter((i) => !q || fold(`${i.name} ${i.description} ${i.kind}`).includes(q));
  return CATEGORIES.map((category) => ({ category, items: categoryItems(hits, category) })).filter((g) => g.items.length > 0);
}

/** Only ready kinds the challenge allows can be placed (drag, click, Enter, command palette). */
export const canAdd = (item: Pick<CatalogItem, "status" | "allowed">): boolean => item.status === "ready" && item.allowed;
