import type { RawRun, TraceSummary } from "./binding";
import { TimelineView } from "./timeline";
import type { Metrics, SimEvent, Trace } from "./types";

const registry = new FinalizationRegistry<RawRun>((raw) => {
  try { raw.free(); } catch { /* already freed */ }
});

export class SimRun {
  #raw: RawRun | null;
  #timeline: TimelineView | null = null;

  constructor(raw: RawRun) {
    this.#raw = raw;
    registry.register(this, raw, this);
  }

  #live(): RawRun {
    if (!this.#raw) throw new Error("SimRun already freed");
    return this.#raw;
  }

  /** @internal used by Sim.grade */
  raw(): RawRun { return this.#live(); }

  get metrics(): Metrics { return this.#live().metrics() as Metrics; }
  get events(): SimEvent[] { return this.#live().events() as SimEvent[]; }

  get timeline(): TimelineView {
    const raw = this.#live();
    this.#timeline ??= new TimelineView(raw.timelineHeader(), raw.timelineData());
    return this.#timeline;
  }

  traceSummaries(): TraceSummary[] { return this.#live().traceSummaries(); }
  trace(i: number): Trace { return this.#live().trace(i) as Trace; }
  resultJson(): string { return this.#live().resultJson(); }

  free(): void {
    if (!this.#raw) return;
    registry.unregister(this);
    this.#raw.free();
    this.#raw = null;
  }
}
