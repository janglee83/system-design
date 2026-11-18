import type { NodeArtKind } from "./art/NodeArt";
import manifest from "./art/manifest.json";

export type Category = "entry" | "compute" | "data" | "cache" | "msg" | "storage" | "external";
/** ready: in the engine now; planned: the next engine work; later: drawn, not scheduled. */
export type KindStatus = "ready" | "planned" | "later";
export interface KindInfo {
  kind: NodeArtKind;
  category: Category;
  status: KindStatus;
}

/** Every drawn kind, from the design assets' manifest (design-system §12). */
export const KINDS: ReadonlyMap<string, KindInfo> = new Map(
  manifest.kinds.map((k) => [k.kind, { kind: k.kind as NodeArtKind, category: k.category as Category, status: k.status as KindStatus }]),
);

/** The illustration for a kind, or null when none is drawn. */
export const kindArt = (kind: string): NodeArtKind | null => KINDS.get(kind)?.kind ?? null;

export const categoryOf = (kind: string): Category => KINDS.get(kind)?.category ?? "external";

/** The category accent of a kind. It tints illustrations and tiles only. */
export const categoryColor = (kind: string): string => `var(--sd-cat-${categoryOf(kind)})`;
