import type { ComponentMeta } from "@sd/sim";
import { connect, type ConnectRefusal } from "./model/ops";
import type { DesignStore } from "./store/design-store";

export type ConnectOutcome = { ok: true; edgeId: string } | { ok: false; reason: ConnectRefusal };

export function connectNodes(
  api: DesignStore,
  metas: ReadonlyMap<string, ComponentMeta>,
  from: string,
  to: string,
): ConnectOutcome {
  // Widened on purpose: TS cannot see the assignment inside the apply() callback below.
  let outcome = { ok: false, reason: "unknown-node" } as ConnectOutcome;
  api.getState().apply((d) => {
    const r = connect(d, from, to, metas);
    outcome = "edgeId" in r ? { ok: true, edgeId: r.edgeId } : { ok: false, reason: r.refused };
    return r.design;
  });
  if (outcome.ok) api.getState().select({ nodes: [], edges: [outcome.edgeId], groups: [] });
  return outcome;
}
