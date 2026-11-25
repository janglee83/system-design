"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

/** Where a page puts its own top-bar controls: "main" after the nav, "end" after the utilities. */
export type SlotName = "main" | "end";
type Targets = Record<SlotName, HTMLElement | null>;
type Ctx = { targets: Targets; register(name: SlotName, el: HTMLElement | null): void };

const SlotCtx = createContext<Ctx | null>(null);

export function TopBarSlotsProvider({ children }: { children: React.ReactNode }) {
  const [targets, setTargets] = useState<Targets>({ main: null, end: null });
  // A callback ref per slot; the setter is stable, so registering never loops.
  const [register] = useState(() => (name: SlotName, el: HTMLElement | null) =>
    setTargets((t) => (t[name] === el ? t : { ...t, [name]: el })),
  );
  return <SlotCtx.Provider value={{ targets, register }}>{children}</SlotCtx.Provider>;
}

/** The empty place in the top bar that a page fills. */
export function TopBarSlot({ name, className }: { name: SlotName; className?: string }) {
  const register = useContext(SlotCtx)?.register;
  // Stable per slot: an inline ref would unregister and register again on every render.
  const ref = useCallback((el: HTMLElement | null) => register?.(name, el), [register, name]);
  return <div className={className} data-slot={name} ref={ref} />;
}

/** Renders `children` into the named top-bar slot (nothing until the bar has mounted). */
export function TopBarPortal({ name, children }: { name: SlotName; children: React.ReactNode }) {
  const target = useContext(SlotCtx)?.targets[name] ?? null;
  return target ? createPortal(children, target) : null;
}
