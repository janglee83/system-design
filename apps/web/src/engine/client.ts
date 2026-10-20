import type { EngineError, EngineRequest, Envelope, Reply, ResultOf } from "./protocol";

export interface WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(message: Envelope, transfer?: Transferable[]): void;
  terminate(): void;
}

/** The worker answered with an error (validation issues, bad input, wasm load failure). */
export class EngineRequestError extends Error {
  constructor(readonly error: EngineError) {
    super(error.kind === "validation" ? "validation" : error.message);
    this.name = "EngineRequestError";
  }
}

/** The worker died or was restarted while the request was pending. */
export class EngineCrashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineCrashError";
  }
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class EngineClient {
  #factory: () => WorkerLike;
  #worker!: WorkerLike;
  #next = 1;
  #pending = new Map<number, Pending>();
  #listeners = new Set<(e: EngineCrashError) => void>();
  /** Set once terminate() ran: every later request rejects with it. */
  #stopped: EngineCrashError | null = null;

  constructor(factory: () => WorkerLike) {
    this.#factory = factory;
    this.#spawn();
  }

  #spawn(): void {
    const w = this.#factory();
    w.onmessage = (e) => {
      const r = e.data;
      const p = this.#pending.get(r.id);
      if (!p) return;
      this.#pending.delete(r.id);
      if (r.ok) p.resolve(r.value);
      else p.reject(new EngineRequestError(r.error));
    };
    w.onerror = (e) => {
      e.preventDefault?.();
      this.#fail(new EngineCrashError(e.message || "engine worker error"), true);
    };
    this.#worker = w;
  }

  #fail(err: EngineCrashError, notify: boolean): void {
    for (const p of this.#pending.values()) p.reject(err);
    this.#pending.clear();
    if (notify) for (const l of this.#listeners) l(err);
  }

  request<K extends EngineRequest["type"]>(
    request: Extract<EngineRequest, { type: K }>,
    transfer: Transferable[] = [],
  ): Promise<ResultOf[K]> {
    if (this.#stopped) return Promise.reject(this.#stopped);
    const id = this.#next++;
    return new Promise<ResultOf[K]>((resolve, reject) => {
      this.#pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.#worker.postMessage({ id, request }, transfer);
    });
  }

  onCrash(listener: (e: EngineCrashError) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Kills the worker (pending requests reject) and starts a fresh one. */
  restart(): void {
    this.#worker.terminate();
    this.#fail(new EngineCrashError("engine restarted"), false);
    this.#spawn();
  }

  /** Kills the worker for good: pending and later requests reject with EngineCrashError. */
  terminate(): void {
    this.#worker.terminate();
    this.#stopped = new EngineCrashError("engine stopped");
    this.#fail(this.#stopped, false);
  }
}

export function createBrowserEngine(): EngineClient {
  // This exact `new Worker(new URL(...))` shape is what webpack recognizes as a worker entry.
  return new EngineClient(
    () => new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike,
  );
}
