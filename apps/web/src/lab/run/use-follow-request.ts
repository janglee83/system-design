"use client";
import { useReactFlow } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { toast } from "@/ui/toast-store";
import { currentRun, runAvailable } from "../store/run-store";
import { NODE_SIZE } from "../model/design";
import { useDesignApi, usePlaybackApi, useRunsApi, useTraceApi } from "../store/LabStores";
import { focusViewport } from "./focus-viewport";

/** Starts following a sampled request of the current run: loads its trace and moves playback to it (§7.4). */
export function useFollowRequest(): (summaryIndex: number) => void {
  const t = useTranslations("trace");
  const client = useEngineStore((s) => (s.status === "ready" ? s.client : null));
  const epoch = useEngineStore((s) => s.epoch);
  const runs = useRunsApi();
  const trace = useTraceApi();
  const playback = usePlaybackApi();
  const flow = useReactFlow();
  const design = useDesignApi();
  return useCallback(
    (index: number) => {
      const run = currentRun(runs.getState());
      if (!run || !client) return;
      if (!runAvailable(run, epoch)) {
        toast(t("unavailable"), "warn");
        return;
      }
      void client
        .request({ type: "trace", runId: run.engineRunId, index })
        .then((tr) => {
          trace.getState().pick(run.id, tr);
          playback.getState().pause();
          playback.getState().seek(tr.startMs);
          // Fit the request's path into the canvas below the trace card (measured once it renders), at most 100 %.
          const ids = new Set(tr.steps.map((s) => s.nodeId));
          const fit = () => {
            const canvasEl = document.querySelector<HTMLElement>('[data-testid="lab-canvas"]');
            const cardEl = document.querySelector<HTMLElement>('[data-testid="trace-card"]');
            if (!canvasEl) return;
            const c = canvasEl.getBoundingClientRect();
            const below = cardEl ? cardEl.getBoundingClientRect().bottom - c.top + 16 : 48;
            const d = design.getState().design;
            const nodes = d.nodes.filter((n) => ids.has(n.id));
            const first = nodes[0];
            if (!first) return;
            const edges = d.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
            void flow.setViewport(
              focusViewport({ nodes, edges, failingId: first.id, only: [...ids], nodeSize: NODE_SIZE, canvas: { width: c.width, height: c.height }, area: { top: below, side: 48, bottom: 72 }, calloutHeight: 0 }),
              { duration: 300 },
            );
          };
          requestAnimationFrame(() => requestAnimationFrame(fit));
        })
        .catch(() => toast(t("unavailable"), "warn"));
    },
    [client, epoch, runs, trace, playback, flow, design, t],
  );
}
