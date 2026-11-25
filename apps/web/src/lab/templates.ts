import type { TemplateId } from "./model/templates";

/** A challenge's starting design, as the empty Lab lists it. */
export interface ChallengeStart {
  id: string;
  title: string;
  /** The kinds in its start graph, for the card's mini strip. */
  kinds: string[];
}

export type TemplateCard =
  | { kind: "builtin"; id: TemplateId; kinds: string[]; suggested: boolean }
  | { kind: "challenges"; starts: ChallengeStart[]; more: number };

const BUILTIN_KINDS: Record<TemplateId, string[]> = { empty: [], webDb: ["client", "web-server", "postgres"] };

/** The empty Lab's three cards: Trống, the suggested three-tier start, and up to 3 challenge starts. */
export function templateCards(starts: readonly ChallengeStart[], max = 3): TemplateCard[] {
  const cards: TemplateCard[] = (["empty", "webDb"] as const).map((id) => ({ kind: "builtin" as const, id, kinds: BUILTIN_KINDS[id], suggested: id === "webDb" }));
  if (starts.length > 0) cards.push({ kind: "challenges", starts: starts.slice(0, max), more: Math.max(0, starts.length - max) });
  return cards;
}
