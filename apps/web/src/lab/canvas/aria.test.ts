import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import vi from "../../../messages/vi.json";
import { flowAriaLabels, nodeAccessibleName } from "./aria";

const tVi = createTranslator({ locale: "vi", messages: vi });

describe("React Flow aria labels", () => {
  it("translates every built-in text, including the move announcement", () => {
    const labels = flowAriaLabels(tVi);
    expect(labels["minimap.ariaLabel"]).toBe("Bản đồ thu nhỏ");
    expect(labels["node.a11yDescription.default"]).toMatch(/thành phần/);
    expect(labels["node.a11yDescription.ariaLiveMessage"]({ direction: "left", x: 32, y: 48 })).toBe(
      "Đã dời thành phần đang chọn sang trái. Vị trí mới: x 32, y 48.",
    );
    for (const v of Object.values(labels)) if (typeof v === "string") expect(v).not.toMatch(/Press|Zoom|Mini Map|Handle/);
  });
});

describe("node accessible name (design-system §5)", () => {
  const base = { label: "Máy chủ web 1", kind: "Máy chủ web", selected: false, locked: false, issues: 0 };
  it("names the node and its kind", () => {
    expect(nodeAccessibleName(base, tVi)).toBe("Máy chủ web 1, Máy chủ web");
  });
  it("adds only the parts that apply, in order", () => {
    expect(nodeAccessibleName({ ...base, state: "busy", selected: true, locked: true, issues: 2 }, tVi)).toBe(
      "Máy chủ web 1, Máy chủ web, Bận, đang chọn, đã khoá, 2 vấn đề",
    );
    expect(nodeAccessibleName({ ...base, state: "normal", issues: 1 }, tVi)).toBe("Máy chủ web 1, Máy chủ web, 1 vấn đề");
  });
});

