"use client";
import type { ComponentMeta } from "@sd/sim";
import { useMemo } from "react";
import { useEngineStore } from "@/engine/EngineProvider";

const EMPTY: ReadonlyMap<string, ComponentMeta> = new Map();

export function useMetas(): ReadonlyMap<string, ComponentMeta> {
  const components = useEngineStore((s) => s.info?.components);
  return useMemo(() => (components ? new Map(components.map((m) => [m.kind, m])) : EMPTY), [components]);
}
