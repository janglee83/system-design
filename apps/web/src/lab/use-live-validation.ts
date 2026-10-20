"use client";
import { useEffect } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { toEngineGraph } from "./model/sim-input";
import { useCheckApi, useDesignApi } from "./store/LabStores";

const DEBOUNCE_MS = 150;

/** Re-validates and re-prices the design 150 ms after each change (R11). */
export function useLiveValidation(): void {
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const design = useDesignApi();
  const check = useCheckApi();
  useEffect(() => {
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const d = design.getState().design;
      const seq = check.getState().begin();
      client
        .request({ type: "validate", graph: toEngineGraph(d), limits: d.challenge?.limits ?? null, calibration: d.calibration })
        .then((r) => check.getState().finish(seq, r))
        .catch(() => check.getState().fail(seq));
    };
    run();
    const unsub = design.subscribe((s, prev) => {
      if (s.design === prev.design) return;
      check.getState().markStale(); // synchronously, so Run cannot use the old result (R11)
      clearTimeout(timer);
      timer = setTimeout(run, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [client, design, check]);
}
