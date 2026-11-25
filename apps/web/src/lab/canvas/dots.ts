/** Request dots (design-system §7.1): 4 per edge, one trip every 2.4 s at 1×. */
export const DOTS_PER_EDGE = 4;
export const DOT_CYCLE_S = 2.4;

/** The dots an edge draws now, or null when it draws none. */
export function edgeDots(s: {
  playing: boolean;
  reducedMotion: boolean;
  rate: number;
  state: "normal" | "hot" | "dead";
  speed: number;
}): { durS: number; dots: { beginS: number; rejected: boolean }[] } | null {
  if (!s.playing || s.reducedMotion || s.rate <= 0 || s.state === "dead") return null;
  const durS = DOT_CYCLE_S / s.speed;
  const dots = Array.from({ length: DOTS_PER_EDGE }, (_, i) => ({
    // Staggered evenly along the edge; negative begin starts each dot part-way.
    beginS: i === 0 ? 0 : -Math.round((durS / DOTS_PER_EDGE) * i * 1000) / 1000,
    // Into an overloaded node, one in four is turned away (a hollow dot).
    rejected: s.state === "hot" && i === DOTS_PER_EDGE - 1,
  }));
  return { durS, dots };
}
