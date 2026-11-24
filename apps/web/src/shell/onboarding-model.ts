/** The five first-run tasks (design-system §10), in order. */
export const ONBOARDING_TASKS = ["addClient", "connectWeb", "addDatabase", "firstRun", "whereItBroke"] as const;
export type OnboardingTask = (typeof ONBOARDING_TASKS)[number];
export const ONBOARDING_KEY = "sd-onboarding";

export interface OnboardingState {
  hidden: boolean;
  done: OnboardingTask[];
}

type Graph = { nodes: readonly { id: string; kind: string }[]; edges: readonly { from: string; to: string }[] };

/** A client reaches a web server directly or through one load balancer. */
function clientReachesWeb(g: Graph): boolean {
  const kind = new Map(g.nodes.map((n) => [n.id, n.kind]));
  const out = (id: string) => g.edges.filter((e) => e.from === id).map((e) => e.to);
  return g.nodes
    .filter((n) => n.kind === "client")
    .some((c) => out(c.id).some((to) => kind.get(to) === "web-server" || (kind.get(to) === "lb" && out(to).some((w) => kind.get(w) === "web-server"))));
}

/** Ticks tasks from the design and app events; a ticked task stays ticked. Returned in task order. */
export function tickTasks(done: readonly OnboardingTask[], g: Graph, e: { ran: boolean; whyUsed: boolean; passedSeen: boolean }): OnboardingTask[] {
  const now = new Set<OnboardingTask>(done);
  if (g.nodes.some((n) => n.kind === "client")) now.add("addClient");
  if (clientReachesWeb(g)) now.add("connectWeb");
  if (g.nodes.some((n) => n.kind === "postgres")) now.add("addDatabase");
  if (e.ran) now.add("firstRun");
  if (e.whyUsed || e.passedSeen) now.add("whereItBroke");
  return ONBOARDING_TASKS.filter((t) => now.has(t));
}

/** Stored progress from this browser, ignoring anything malformed. */
export function parseOnboarding(raw: string | null): OnboardingState {
  try {
    const v = JSON.parse(raw ?? "") as { hidden?: unknown; done?: unknown };
    const done = Array.isArray(v.done) ? v.done.filter((x): x is OnboardingTask => (ONBOARDING_TASKS as readonly unknown[]).includes(x)) : [];
    return { hidden: v.hidden === true, done };
  } catch {
    return { hidden: false, done: [] };
  }
}
