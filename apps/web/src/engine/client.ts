import type { EngineError, EngineRequest, Envelope, Reply, ResultOf } from "./protocol";

export interface WorkerLike {
  onmessage: ((e: MessageEvent<Reply>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  onmessageerror: ((e: MessageEvent) => void) | null;
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

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

/** Engine epochs are unique in the page: a new client or a restarted worker gets the next one. */
let epochs = 0;

/** A request the worker has not answered by then is treated as a stuck worker. */
export const REQUEST_TIMEOUT_MS = 30_000;

export class EngineClient {
  #factory: () => WorkerLike;
  #timeoutMs: number;
  #worker!: WorkerLike;
  #next = 1;
  #pending = new Map<number, Pending>();
  #listeners = new Set<(e: EngineCrashError) => void>();
  /** Set once terminate() ran: every later request rejects with it. */
  #stopped: EngineCrashError | null = null;
  /** Set when the worker crashed: later requests reject with it until restart(). */
  #crashed: EngineCrashError | null = null;
  #epoch = epochs++;
  #restartListeners = new Set<(epoch: number) => void>();

  constructor(factory: () => WorkerLike, { timeoutMs = REQUEST_TIMEOUT_MS }: { timeoutMs?: number } = {}) {
    this.#factory = factory;
    this.#timeoutMs = timeoutMs;
    this.#spawn();
  }

  #spawn(): void {
    const w = this.#factory();
    w.onmessage = (e) => {
      const r = e.data;
      const p = this.#take(r.id);
      if (!p) return;
      if (r.ok) p.resolve(r.value);
      else p.reject(new EngineRequestError(r.error));
      // A trapped wasm instance cannot be trusted: replace the worker. Other pending requests
      // reject with EngineCrashError; the next request goes to the fresh worker.
      if (!r.ok && r.error.kind === "crash" && w === this.#worker) this.restart();
    };
    w.onerror = (e) => {
      e.preventDefault?.();
      if (w === this.#worker) this.#crash(new EngineCrashError(e.message || "engine worker error"));
    };
    // A reply that could not be deserialized: we cannot tell which request it answered.
    w.onmessageerror = () => {
      if (w === this.#worker) this.#crash(new EngineCrashError("engine reply could not be read"));
    };
    this.#worker = w;
  }

  #take(id: number): Pending | undefined {
    const p = this.#pending.get(id);
    if (!p) return undefined;
    clearTimeout(p.timer);
    this.#pending.delete(id);
    return p;
  }

  #fail(err: EngineCrashError): void {
    for (const id of [...this.#pending.keys()]) this.#take(id)!.reject(err);
  }

  #crash(err: EngineCrashError): void {
    this.#crashed = err;
    this.#fail(err);
    for (const l of this.#listeners) l(err);
  }

  request<K extends EngineRequest["type"]>(
    request: Extract<EngineRequest, { type: K }>,
    transfer: Transferable[] = [],
  ): Promise<ResultOf[K]> {
    const dead = this.#stopped ?? this.#crashed;
    if (dead) return Promise.reject(dead);
    const id = this.#next++;
    return new Promise<ResultOf[K]>((resolve, reject) => {
      const timer = setTimeout(() => {
        const p = this.#take(id);
        if (!p) return;
        p.reject(new EngineCrashError(`engine did not answer within ${Math.round(this.#timeoutMs / 1000)} s`));
        this.restart(); // a stuck worker would hold every later request behind it
      }, this.#timeoutMs);
      this.#pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.#worker.postMessage({ id, request }, transfer);
    });
  }

  onCrash(listener: (e: EngineCrashError) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Which worker instance answers now. Kept runs (trace, export) live in one worker: a run made in
   * an older epoch can no longer be inspected (Task 22, Phase 2 review I6).
   */
  get epoch(): number {
    return this.#epoch;
  }

  onRestart(listener: (epoch: number) => void): () => void {
    this.#restartListeners.add(listener);
    return () => this.#restartListeners.delete(listener);
  }

  /** Kills the worker (pending requests reject) and starts a fresh one in a new epoch. */
  restart(): void {
    if (this.#stopped) return;
    this.#worker.terminate();
    this.#fail(new EngineCrashError("engine restarted"));
    this.#crashed = null;
    this.#epoch = epochs++;
    this.#spawn();
    for (const l of this.#restartListeners) l(this.#epoch);
  }

  /** Kills the worker for good: pending and later requests reject with EngineCrashError. */
  terminate(): void {
    this.#worker.terminate();
    this.#stopped = new EngineCrashError("engine stopped");
    this.#fail(this.#stopped);
  }
}

export function createBrowserEngine(): EngineClient {
  // This exact `new Worker(new URL(...))` shape is what webpack recognizes as a worker entry.
  return new EngineClient(
    () => new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike,
  );
}
