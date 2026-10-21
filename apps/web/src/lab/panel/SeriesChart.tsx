"use client";
import "uplot/dist/uPlot.min.css";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import type { RunRecord } from "../store/run-store";

/** Per-frame series of one node, as plain arrays (x in seconds; busy in percent). */
export function nodeSeries(run: RunRecord, nodeId: string) {
  const tl = run.timeline;
  const x: number[] = [];
  const busy: number[] = [];
  const queued: number[] = [];
  const rejected: number[] = [];
  for (let k = 0; k < tl.frames; k++) {
    x.push((k * tl.frameMs) / 1000);
    busy.push(tl.value(k, nodeId, "busy") * 100);
    queued.push(tl.value(k, nodeId, "queued"));
    rejected.push(tl.value(k, nodeId, "rejected"));
  }
  return { x, busy, queued, rejected };
}

const stats = (v: number[]) =>
  v.length === 0 ? { min: 0, max: 0, mean: 0 } : { min: Math.min(...v), max: Math.max(...v), mean: v.reduce((a, b) => a + b, 0) / v.length };

/** uPlot chart of busy / waiting / rejected over time, themed from the CSS tokens. */
export function SeriesChart({ run, nodeId, label }: { run: RunRecord; nodeId: string; label: string }) {
  const t = useTranslations();
  const box = useRef<HTMLDivElement>(null);
  const data = useMemo(() => nodeSeries(run, nodeId), [run, nodeId]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let plot: { destroy(): void; setSize(s: { width: number; height: number }): void } | null = null;
    let disposed = false;
    const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const draw = async () => {
      const { default: UPlot } = await import("uplot");
      if (disposed) return;
      plot?.destroy();
      const axis = { stroke: css("--sd-text-3"), grid: { stroke: css("--sd-border"), width: 1 }, ticks: { stroke: css("--sd-border") } };
      plot = new UPlot(
        {
          width: el.clientWidth || 600,
          height: 180,
          legend: { show: true },
          scales: { x: { time: false }, pct: { range: [0, 100] } },
          axes: [{ ...axis }, { ...axis, scale: "pct" }, { ...axis, scale: "count", side: 1 }],
          series: [
            {},
            { label: t("timelineField.busy"), scale: "pct", stroke: css("--sd-busy"), width: 2 },
            { label: t("timelineField.queued"), scale: "count", stroke: css("--sd-accent"), width: 2 },
            { label: t("timelineField.rejected"), scale: "count", stroke: css("--sd-over"), width: 2 },
          ],
        },
        [data.x, data.busy, data.queued, data.rejected],
        el,
      );
    };
    void draw();
    const resize = new ResizeObserver(() => plot?.setSize({ width: el.clientWidth, height: 180 }));
    resize.observe(el);
    // Re-read the colour tokens when the theme changes.
    const theme = new MutationObserver(() => void draw());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      disposed = true;
      resize.disconnect();
      theme.disconnect();
      plot?.destroy();
    };
  }, [data, t]);

  const rows = [
    ["busy", stats(data.busy)],
    ["queued", stats(data.queued)],
    ["rejected", stats(data.rejected)],
  ] as const;
  return (
    <figure aria-label={label}>
      <div ref={box} data-testid="series-chart" />
      <table className="sr-only">
        <tbody>
          {rows.map(([k, s]) => (
            <tr key={k}>
              <th scope="row">{t(`timelineField.${k}`)}</th>
              <td>{s.min.toFixed(1)}</td>
              <td>{s.max.toFixed(1)}</td>
              <td>{s.mean.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
