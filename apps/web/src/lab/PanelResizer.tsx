"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/ui/cn";

const STEP = 16;
const KEY = "sd-lab-panels";

/** The inspector's width: 368 by default, 320–480 (Design v2 §4, Task 35a). */
export const INSPECTOR_WIDTH = { initial: 368, min: 320, max: 480 } as const;

type Limits = { initial: number; min: number; max: number };
const clamp = (v: number, l: Limits) => Math.min(l.max, Math.max(l.min, Math.round(v)));

/** A panel width kept per viewer in this browser (`sd-lab-panels`). */
export function usePanelWidth(name: string, limits: Limits): [number, (w: number) => void] {
  const [width, setWidth] = useState(limits.initial);
  useEffect(() => {
    try {
      const v = (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>)[name];
      if (typeof v === "number") setWidth(clamp(v, limits));
    } catch {
      // storage blocked or malformed: the default width
    }
  }, [name, limits]);
  const set = (w: number) => {
    const next = clamp(w, limits);
    setWidth(next);
    try {
      const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
      window.localStorage.setItem(KEY, JSON.stringify({ ...all, [name]: next }));
    } catch {
      // storage blocked: the width lasts for this page only
    }
  };
  return [width, set];
}

/**
 * A vertical splitter on a right-hand panel's left edge: drag it, or focus it and use the arrow
 * keys (left widens), Home and End.
 */
export function PanelResizer({ label, value, min, max, onChange, className }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; className?: string }) {
  const drag = useRef<{ x: number; start: number } | null>(null);
  const limit = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: value };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(limit(drag.current.start + (drag.current.x - e.clientX)));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const next = e.key === "ArrowLeft" ? value + STEP : e.key === "ArrowRight" ? value - STEP : e.key === "Home" ? min : e.key === "End" ? max : null;
        if (next === null) return;
        e.preventDefault();
        onChange(limit(next));
      }}
      className={cn(
        "absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:bg-transparent hover:after:bg-border-strong focus-visible:after:bg-accent-text",
        className,
      )}
    />
  );
}
