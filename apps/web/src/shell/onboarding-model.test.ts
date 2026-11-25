import { describe, expect, it } from "vitest";
import { ONBOARDING_TASKS, parseOnboarding, tickTasks } from "./onboarding-model";

const node = (id: string, kind: string) => ({ id, kind });
const none = { ran: false, whyUsed: false, passedSeen: false };

describe("first-run checklist (design-system §10)", () => {
  it("has the five tasks in order", () => {
    expect(ONBOARDING_TASKS).toEqual(["addClient", "connectWeb", "addDatabase", "firstRun", "whereItBroke"]);
  });

  it("ticks tasks from the design and from app events", () => {
    expect(tickTasks([], { nodes: [], edges: [] }, none)).toEqual([]);
    const d1 = { nodes: [node("c", "client")], edges: [] };
    expect(tickTasks([], d1, none)).toEqual(["addClient"]);
    const direct = { nodes: [node("c", "client"), node("w", "web-server")], edges: [{ from: "c", to: "w" }] };
    expect(tickTasks([], direct, none)).toEqual(["addClient", "connectWeb"]);
    const viaLb = {
      nodes: [node("c", "client"), node("l", "lb"), node("w", "web-server"), node("p", "postgres")],
      edges: [
        { from: "c", to: "l" },
        { from: "l", to: "w" },
      ],
    };
    expect(tickTasks([], viaLb, { ran: true, whyUsed: false, passedSeen: false })).toEqual(["addClient", "connectWeb", "addDatabase", "firstRun"]);
    expect(tickTasks([], viaLb, { ran: true, whyUsed: false, passedSeen: true })).toContain("whereItBroke");
  });

  it("keeps ticked tasks ticked (progress survives edits and reloads)", () => {
    expect(tickTasks(["addClient", "firstRun"], { nodes: [], edges: [] }, none)).toEqual(["addClient", "firstRun"]);
  });

  it("reads stored progress defensively", () => {
    expect(parseOnboarding(null)).toEqual({ hidden: false, done: [] });
    expect(parseOnboarding("not json")).toEqual({ hidden: false, done: [] });
    expect(parseOnboarding(JSON.stringify({ hidden: true, done: ["addClient", "bogus", 3] }))).toEqual({ hidden: true, done: ["addClient"] });
  });
});
