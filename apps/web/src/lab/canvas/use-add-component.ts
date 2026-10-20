"use client";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { NODE_SIZE } from "../model/design";
import { useTranslations } from "next-intl";
import { announce } from "@/ui/announce";
import { displayLabel } from "../labels";
import { addNode, freeSpot } from "../model/ops";
import { useDesignApi } from "../store/LabStores";
import { useMetas } from "../use-metas";

/** Adds a component at a screen point, or at the centre of the canvas, and selects it. */
export function useAddComponent() {
  const flow = useReactFlow();
  const api = useDesignApi();
  const metas = useMetas();
  const t = useTranslations();
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
      const at = { x: p.x - NODE_SIZE.width / 2, y: p.y - NODE_SIZE.height / 2 };
      let id: string | null = null;
      api.getState().apply((d) => {
        // A drop goes exactly where it was dropped; a click finds the first free spot.
        const r = addNode(d, meta, screen ? at : freeSpot(d, at));
        id = r.id;
        return r.design;
      });
      if (id) {
        api.getState().select({ nodes: [id], edges: [], groups: [] });
        const node = api.getState().design.nodes.find((n) => n.id === id);
        if (node) announce(t("palette.added", { name: displayLabel(node, meta, t) }));
      }
      return id;
    },
    [flow, api, metas, t],
  );
}
