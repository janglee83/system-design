import { describe, expect, it } from "vitest";
import { templateCards } from "./templates";

const starts = [
  { id: "c-l0-first-launch", title: "Mở bán cửa hàng nhỏ", kinds: ["client"] },
  { id: "c-l0-b", title: "B", kinds: ["client", "web-server"] },
  { id: "c-l0-c", title: "C", kinds: ["client"] },
  { id: "c-l0-d", title: "D", kinds: ["client"] },
];

describe("template cards (design-system §9, default 2)", () => {
  it("offers Trống, Users → Web server → PostgreSQL (suggested), then challenge starts", () => {
    const cards = templateCards(starts);
    expect(cards.slice(0, 2)).toEqual([
      { kind: "builtin", id: "empty", kinds: [], suggested: false },
      { kind: "builtin", id: "webDb", kinds: ["client", "web-server", "postgres"], suggested: true },
    ]);
    expect(cards.slice(2)).toEqual([{ kind: "challenges", starts: starts.slice(0, 3), more: 1 }]);
  });

  it("has no challenge card without challenge starts", () => {
    expect(templateCards([]).map((c) => c.kind)).toEqual(["builtin", "builtin"]);
  });
});
