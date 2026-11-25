"use client";
import { useRef } from "react";
import { cn } from "./cn";

const STEP = 16;

/** A horizontal splitter above a bottom panel: drag it, or focus it and use the arrow keys. */
export function ResizeHandle({
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { y: e.clientY, start: value };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(clamp(drag.current.start + (drag.current.y - e.clientY)));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        const next =
          e.key === "ArrowUp" ? value + STEP : e.key === "ArrowDown" ? value - STEP : e.key === "Home" ? min : e.key === "End" ? max : null;
        if (next === null) return;
        e.preventDefault();
        onChange(clamp(next));
      }}
      className={cn(
        // A 6 px grip with a 36 × 3 bar (design-system §8).
        "relative flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-t border-border bg-surface after:h-[3px] after:w-9 after:rounded-full after:bg-border-strong after:opacity-50 hover:after:opacity-100 focus-visible:after:bg-accent-text focus-visible:after:opacity-100",
        className,
      )}
    />
  );
}
