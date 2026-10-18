import type { TimelineHeader } from "./binding";

export class TimelineView {
  private readonly nodeIndex: Map<string, number>;
  private readonly fieldIndex: Map<string, number>;

  constructor(private readonly header: TimelineHeader, readonly data: Float32Array) {
    this.nodeIndex = new Map(header.nodeIds.map((id, i) => [id, i]));
    this.fieldIndex = new Map(header.fields.map((f, i) => [f, i]));
  }

  get frames(): number { return this.header.frames; }
  get frameMs(): number { return this.header.frameMs; }
  get nodeIds(): readonly string[] { return this.header.nodeIds; }
  get fields(): readonly string[] { return this.header.fields; }

  private offset(frame: number, nodeId: string, field: string): number {
    const n = this.nodeIndex.get(nodeId);
    if (n === undefined) throw new Error(`unknown node ${nodeId}`);
    const f = this.fieldIndex.get(field);
    if (f === undefined) throw new Error(`unknown field ${field}`);
    if (frame < 0 || frame >= this.frames) throw new Error(`frame ${frame} out of range`);
    return (frame * this.header.nodeIds.length + n) * this.header.fields.length + f;
  }

  value(frame: number, nodeId: string, field: string): number {
    return this.data[this.offset(frame, nodeId, field)]!;
  }

  series(nodeId: string, field: string): Float32Array {
    const out = new Float32Array(this.frames);
    for (let k = 0; k < this.frames; k++) out[k] = this.value(k, nodeId, field);
    return out;
  }
}
