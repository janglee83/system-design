import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { displayLabel } from "./labels";
import { meta } from "../test/metas";

const tEn = createTranslator({ locale: "en", messages: en });
const tVi = createTranslator({ locale: "vi", messages: vi });
const base = { kind: "web-server", replicas: 1, config: {}, position: { x: 0, y: 0 }, groupId: null };

describe("displayLabel", () => {
  it("uses the user's label when set", () => {
    expect(displayLabel({ ...base, id: "web-server-2", label: "API" }, meta("web-server"), tEn)).toBe("API");
  });
  it("falls back to the translated name and number, in the current language", () => {
    const n = { ...base, id: "web-server-2", label: "" };
    expect(displayLabel(n, meta("web-server"), tEn)).toBe("Web server 2");
    expect(displayLabel(n, meta("web-server"), tVi)).toBe("Máy chủ web 2");
  });
  it("shows the id for unknown kinds and odd ids", () => {
    expect(displayLabel({ ...base, kind: "quantum", id: "q", label: "" }, null, tEn)).toBe("q");
    expect(displayLabel({ ...base, id: "custom", label: "" }, meta("web-server"), tEn)).toBe("Web server (custom)");
  });
});
