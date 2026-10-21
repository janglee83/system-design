import type { Calibration, Capabilities, ComponentMeta } from "@sd/sim";
import { createStore } from "zustand/vanilla";
import { EngineRequestError, type EngineClient } from "./client";

export interface EngineInfo {
  version: string;
  components: ComponentMeta[];
  calibration: Calibration;
  capabilities: Capabilities;
}

export interface EngineState {
  status: "idle" | "loading" | "ready" | "error";
  info: EngineInfo | null;
  error: string | null;
  client: EngineClient | null;
  /** The client's current epoch; runs from an older one cannot be inspected. */
  epoch: number;
  start(): void;
  retry(): void;
  /** Terminates the client and returns to idle; start() works again afterwards. */
  stop(): void;
}

export function createEngineStore(makeClient: () => EngineClient) {
  return createStore<EngineState>()((set, get) => {
    /** Bumped by every load and by stop(): only the latest load may write the result. */
    let generation = 0;
    async function load(client: EngineClient) {
      const gen = ++generation;
      set({ status: "loading", error: null });
      try {
        const [version, components, calibration, capabilities] = await Promise.all([
          client.request({ type: "engineVersion" }),
          client.request({ type: "listComponents" }),
          client.request({ type: "defaultCalibration" }),
          client.request({ type: "capabilities" }),
        ]);
        if (gen !== generation) return; // superseded by a retry, or stopped
        set({ status: "ready", info: { version, components, calibration, capabilities } });
      } catch (e) {
        if (gen !== generation) return; // superseded or stopped: not an engine failure
        const message = e instanceof EngineRequestError ? e.error.kind : e instanceof Error ? e.message : String(e);
        set({ status: "error", error: message });
      }
    }
    return {
      status: "idle",
      info: null,
      error: null,
      client: null,
      epoch: -1,
      start() {
        if (get().client) return;
        const client = makeClient();
        client.onCrash((e) => {
          if (get().client === client) set({ status: "error", error: e.message });
        });
        client.onRestart((epoch) => {
          if (get().client === client) set({ epoch });
        });
        set({ client, epoch: client.epoch });
        void load(client);
      },
      retry() {
        const client = get().client;
        if (!client) return get().start();
        client.restart();
        void load(client);
      },
      stop() {
        generation++;
        const client = get().client;
        set({ client: null, status: "idle", info: null, error: null, epoch: -1 });
        client?.terminate();
      },
    };
  });
}

export type EngineStore = ReturnType<typeof createEngineStore>;
