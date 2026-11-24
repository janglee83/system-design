export interface Progress {
  doneLessons: readonly string[];
  passedChallenges: readonly string[];
}
type Level = { id: string; exitChallenge: string | null };

/** The first earlier level whose exit check is not passed, or null when the level is open (default 5). */
export function lockReasonLevel(levelId: string, levels: readonly Level[], p: Progress): string | null {
  const i = levels.findIndex((l) => l.id === levelId);
  for (let k = 0; k < i; k++) {
    const exit = levels[k]!.exitChallenge;
    if (exit && !p.passedChallenges.includes(exit)) return levels[k]!.id;
  }
  return null;
}

export const isUnlocked = (levelId: string, levels: readonly Level[], p: Progress): boolean => lockReasonLevel(levelId, levels, p) === null;

/** Whether a challenge can be played in the Lab now (design-system §11 readiness pills). */
export function readiness(c: { hasFolder: boolean; allowedKinds: readonly string[] }, engineKinds: readonly string[]): "ready" | "waiting" | "noLab" {
  if (c.allowedKinds.length === 0) return "noLab";
  return c.hasFolder && c.allowedKinds.every((k) => engineKinds.includes(k)) ? "ready" : "waiting";
}
