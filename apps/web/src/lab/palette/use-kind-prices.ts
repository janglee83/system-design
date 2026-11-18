"use client";
import type { ComponentMeta } from "@sd/sim";
import { useEffect, useState } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { useDesign } from "../store/LabStores";

/**
 * The monthly price of one default instance of each engine kind, asked of the engine once per
 * calibration (a validate of one node per kind; its costs are what the tiles show).
 */
export function useKindPrices(metas: readonly ComponentMeta[]): Readonly<Record<string, number | null>> {
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const calibration = useDesign((s) => s.design.calibration);
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  useEffect(() => {
    if (!client || metas.length === 0) return;
    let live = true;
    const graph = { nodes: metas.map((m) => ({ id: m.kind, kind: m.kind, label: "", replicas: 1, config: {} })), edges: [] };
    client
      .request({ type: "validate", graph, limits: null, calibration })
      .then((r) => {
        if (live) setPrices(r.costs);
      })
      .catch(() => undefined); // prices are a hint; the rows simply show none
    return () => {
      live = false;
    };
  }, [client, metas, calibration]);
  return prices;
}
