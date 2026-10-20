"use client";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { NODE_SIZE } from "../model/design";
import { addNode } from "../model/ops";
import { useDesignApi } from "../store/LabStores";
import { useMetas } from "../use-metas";

/** Adds a component at a screen point, or at the centre of the canvas, and selects it. */
export function useAddComponent() {
  const flow = useReactFlow();
  const api = useDesignApi();
  const metas = useMetas();
  return useCallback(
    (kind: string, screen?: { x: number; y: number }): string | null => {
      const meta = metas.get(kind);
      if (!meta) return null;
      let point = screen;
      if (!point) {
        const r = document.querySelector('[data-testid="lab-canvas"]')?.getBoundingClientRect();
        point = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
      }
      const p = flow.screenToFlowPosition(point);
      let id: string | null = null;
      api.getState().apply((d) => {
        const r = addNode(d, meta, { x: p.x - NODE_SIZE.width / 2, y: p.y - NODE_SIZE.height / 2 });
        id = r.id;
        return r.design;
      });
      if (id) api.getState().select({ nodes: [id], edges: [], groups: [] });
      return id;
    },
    [flow, api, metas],
  );
}
