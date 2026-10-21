"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";
import { createBrowserEngine, EngineCrashError, type EngineClient } from "./client";
import { createEngineStore, type EngineState, type EngineStore } from "./engine-store";

const Ctx = createContext<EngineStore | null>(null);

/** One engine per tab, created on first use (the shell mounts it; the Lab starts it). */
export function EngineProvider({
  children,
  makeClient = createBrowserEngine,
}: {
  children: React.ReactNode;
  /** Tests inject an in-process worker. */
  makeClient?: () => EngineClient;
}) {
  const [store] = useState(() => createEngineStore(makeClient));
  // stop(), not just terminate(): under StrictMode React unmounts and remounts effects, and the
  // remounted start() must create a fresh client instead of reusing the terminated one.
  useEffect(() => () => store.getState().stop(), [store]);
  useEffect(() => {
    // E2E hook, only in builds made for the e2e run (NEXT_PUBLIC_E2E=1, inlined at build time):
    // lets tests send protocol messages through the real worker and structured clone.
    if (process.env.NEXT_PUBLIC_E2E !== "1") return;
    const w = window as unknown as { __sdEngine?: Pick<EngineClient, "request"> };
    w.__sdEngine = {
      request: (r, transfer) =>
        store.getState().client?.request(r, transfer) ?? Promise.reject(new EngineCrashError("engine not started")),
    };
    return () => {
      delete w.__sdEngine;
    };
  }, [store]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useEngineStore<T>(selector: (s: EngineState) => T): T {
  const store = useContext(Ctx);
  if (!store) throw new Error("useEngineStore outside EngineProvider");
  return useStore(store, selector);
}

/** Starts the engine when the calling component mounts. */
export function useEngineStart(): void {
  const start = useEngineStore((s) => s.start);
  useEffect(() => start(), [start]);
}
