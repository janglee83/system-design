"use client";
import { useEffect } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import type { Design } from "./model/design";
import { toEngineGraph } from "./model/sim-input";
import { useCheckApi, useDesignApi } from "./store/LabStores";

const DEBOUNCE_MS = 150;

/** What the engine's validate and pricing read. Positions, groups and names are not part of it. */
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
    const unsub = design.subscribe((s, prev) => {
      if (s.design === prev.design) return;
      const key = engineKey(s.design);
      if (key === lastKey) return; // a move or a rename: nothing for the engine to re-check
      lastKey = key;
      check.getState().markStale(); // synchronously, so Run cannot use the old result (R11)
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE_MS);
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      unsub();
    };
  }, [client, design, check]);
}
