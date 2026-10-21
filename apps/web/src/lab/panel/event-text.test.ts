import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { EVENT_CODES } from "@/i18n/engine-codes";
import { emptyDesign } from "../model/design";
import { addNode } from "../model/ops";
import { META_BY_KIND, meta } from "../../test/metas";
import { eventLevel, eventText } from "./event-text";

const d = addNode(emptyDesign(), meta("web-server"), { x: 0, y: 0 }).design;

describe("event text", () => {
  it("translates with the node label and the event params", () => {
    const e = { atMs: 3000, node: "web-server-1", code: "instance.down", params: { remaining: 1 } };
    expect(eventText(e, { design: d, metas: META_BY_KIND, t: createTranslator({ locale: "en", messages: en }) })).toBe(
      "Web server 1: one instance stopped; 1 still running.",
    );
    expect(eventText(e, { design: d, metas: META_BY_KIND, t: createTranslator({ locale: "vi", messages: vi }) })).toBe(
      "Máy chủ web 1: một máy ngừng chạy; còn 1 máy hoạt động.",
    );
  });

  it("gives every engine event code a level", () => {
    for (const c of EVENT_CODES) expect(["info", "warn", "error"]).toContain(eventLevel(c));
    expect(eventLevel("instance.down")).toBe("error");
    expect(eventLevel("db.promoted")).toBe("info");
    expect(eventLevel("node.overloaded")).toBe("warn");
  });
});
