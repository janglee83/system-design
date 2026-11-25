"use client";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { NODE_SIZE } from "../model/design";
import { useTranslations } from "next-intl";
import { announce } from "@/ui/announce";
import { displayLabel } from "../labels";
import { addNode, freeSpot } from "../model/ops";
import { useDesignApi, useRunsApi } from "../store/LabStores";
import { useMetas } from "../use-metas";

/**
 * After an add, a node that landed outside the visible canvas brings the whole design into view
 * (48 px padding, at most 100 %) so nothing is clipped at the edge (Task 35a).
 */
function ensureInView(flow: ReturnType<typeof useReactFlow>, node: { position: { x: number; y: number } } | undefined) {
  const r = document.querySelector('[data-testid="lab-canvas"]')?.getBoundingClientRect();
  if (!node || !r) return;
  const a = flow.flowToScreenPosition(node.position);
  const b = flow.flowToScreenPosition({ x: node.position.x + NODE_SIZE.width, y: node.position.y + NODE_SIZE.height });
  if (a.x >= r.left && a.y >= r.top && b.x <= r.right && b.y <= r.bottom) return;
  requestAnimationFrame(() => void flow.fitView({ duration: 200, maxZoom: 1, padding: { top: "48px", left: "48px", right: "48px", bottom: "48px" } }));
}

/** Adds a component at a screen point, or at the centre of the canvas, and selects it (null when refused). */
export function useAddComponent() {
  const flow = useReactFlow();
  const api = useDesignApi();
  const runs = useRunsApi();
  const metas = useMetas();
  const t = useTranslations();
  return useCallback(
    (kind: string, screen?: { x: number; y: number }): string | null => {
      // Only kinds the engine has (not planned or later ones), and never during a run (§3).
      const meta = metas.get(kind);
      if (!meta || runs.getState().status === "running") return null;
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
        ensureInView(flow, api.getState().design.nodes.find((n) => n.id === id));
        const node = api.getState().design.nodes.find((n) => n.id === id);
        if (node) announce(t("palette.added", { name: displayLabel(node, meta, t) }));
      }
      return id;
    },
    [flow, api, runs, metas, t],
  );
}
