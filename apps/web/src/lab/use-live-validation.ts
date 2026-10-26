"use client";
import { useEffect } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import type { Design } from "./model/design";
import { toEngineGraph } from "./model/sim-input";
import { useCheckApi, useDesignApi } from "./store/LabStores";

const DEBOUNCE_MS = 150;

/**
 * What the engine's validate and pricing read: the graph (kinds, labels, replicas, config, edges),
 * the world parameters and the challenge limits. Positions and groups are not part of it.
 */
const engineKey = (d: Design) => JSON.stringify([toEngineGraph(d), d.calibration, d.challenge?.limits ?? null]);

/**
 * Re-validates and re-prices the design 150 ms after each change the engine can see (R11).
 * At most one request is in flight; changes meanwhile make one trailing request for the latest design.
 */
export function useLiveValidation(): void {
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const design = useDesignApi();
  const check = useCheckApi();
  useEffect(() => {
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let trailing = false;
    let disposed = false;
    let lastKey = engineKey(design.getState().design);

    const run = () => {
      if (inFlight) {
        trailing = true;
        return;
      }
      const d = design.getState().design;
      const seq = check.getState().begin();
      inFlight = true;
      client
        .request({ type: "validate", graph: toEngineGraph(d), limits: d.challenge?.limits ?? null, calibration: d.calibration })
        .then((r) => check.getState().finish(seq, r))
        .catch(() => check.getState().fail(seq))
        .finally(() => {
          inFlight = false;
          if (trailing && !disposed) {
            trailing = false;
            run();
          }
        });
    };
    run();
    // The client replaced its worker (a stuck request timed out, or the wasm trapped) while
    // staying "ready": the check in flight was lost, so check again rather than stay blocked.
    const offRestart = client.onRestart(() => {
      check.getState().markStale(); // drops the lost request's failure
      run(); // queued as the trailing request until the old one settles
    });
    const unsub = design.subscribe((s, prev) => {
      if (s.design === prev.design) return;
      // The engine's refusal of the last run (workload.invalid, calibration.invalid…) is about the
      // design as it was. Any change, even to the workload or faults, may have fixed it.
      if (check.getState().runIssues.length > 0) check.getState().setRunIssues([]);
      const key = engineKey(s.design);
      if (key === lastKey) return; // a move or a group change: nothing for the engine to re-check
      lastKey = key;
      check.getState().markStale(); // synchronously, so Run cannot use the old result (R11)
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE_MS);
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      offRestart();
      unsub();
    };
  }, [client, design, check]);
}
