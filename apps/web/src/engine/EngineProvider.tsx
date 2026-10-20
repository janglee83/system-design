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
    // E2E hook, only under browser automation (Playwright sets navigator.webdriver): lets
    // tests send protocol messages through the real worker and structured clone.
    if (!navigator.webdriver) return;
    const hook: Pick<EngineClient, "request"> = {
      request: (r, transfer) =>
        store.getState().client?.request(r, transfer) ?? Promise.reject(new EngineCrashError("engine not started")),
    };
    (window as unknown as { __sdEngine?: typeof hook }).__sdEngine = hook;
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
