import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import vi from "../../../messages/vi.json";
import { flowAriaLabels } from "./aria";

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
