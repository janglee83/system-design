import { describe, expect, it } from "vitest";
import { runBlockReason } from "./run-gate";

const base = { engine: "ready" as const, kinds: ["client", "web-server"], blocking: 0, checked: true };

describe("runBlockReason (design-system §2.2)", () => {
  it("is null when the design can run", () => {
    expect(runBlockReason(base)).toBeNull();
  });
  it("waits for the engine first", () => {
    expect(runBlockReason({ ...base, engine: "loading", kinds: [] })).toEqual({ key: "engine" });
  });
  it("asks for Users and a server before counting problems", () => {
    expect(runBlockReason({ ...base, kinds: [], blocking: 1 })).toEqual({ key: "needsNodes" });
    expect(runBlockReason({ ...base, kinds: ["client"], blocking: 2 })).toEqual({ key: "needsNodes" });
    expect(runBlockReason({ ...base, kinds: ["web-server"], blocking: 1 })).toEqual({ key: "needsNodes" });
  });
  it("then counts the blocking problems", () => {
    expect(runBlockReason({ ...base, blocking: 3 })).toEqual({ key: "problems", count: 3 });
  });
  it("then waits for the check of the latest edit", () => {
    expect(runBlockReason({ ...base, checked: false })).toEqual({ key: "checking" });
  });
});
