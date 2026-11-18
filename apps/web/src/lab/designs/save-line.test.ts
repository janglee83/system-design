import { describe, expect, it } from "vitest";
import { saveLine } from "./save-line";

describe("saveLine (design-system §2.1, §2.2 Done)", () => {
  it("says the design is saved in this browser, and when", () => {
    expect(saveLine({ savedAt: 100, dirty: false, lastRun: null })).toEqual({ key: "saved", at: 100 });
  });
  it("says when there are unsaved changes, or nothing was saved yet", () => {
    expect(saveLine({ savedAt: 100, dirty: true, lastRun: null })).toEqual({ key: "unsaved" });
    expect(saveLine({ savedAt: null, dirty: false, lastRun: null })).toEqual({ key: "never" });
  });
  it("shows the latest run when it finished after the last save", () => {
    expect(saveLine({ savedAt: 100, dirty: false, lastRun: { id: 3, at: 200 } })).toEqual({ key: "ran", run: 3, at: 200 });
    expect(saveLine({ savedAt: 300, dirty: false, lastRun: { id: 3, at: 200 } })).toEqual({ key: "saved", at: 300 });
    expect(saveLine({ savedAt: null, dirty: true, lastRun: { id: 1, at: 50 } })).toEqual({ key: "ran", run: 1, at: 50 });
  });
});
