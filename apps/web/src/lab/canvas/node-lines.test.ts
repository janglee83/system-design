import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { meta } from "../../test/metas";
import { configLine, costLine } from "./node-lines";

const tVi = createTranslator({ locale: "vi", messages: vi });
const tEn = createTranslator({ locale: "en", messages: en });
const node = (kind: string, config: Record<string, number | string> = {}) => ({ id: `${kind}-1`, kind, label: "", replicas: 1, config });

describe("configLine (design-system §5, body line 2 while editing)", () => {
  it("summarises each engine kind, with the engine defaults when a field is unset", () => {
    expect(configLine(node("web-server"), meta("web-server"), { baseRps: 1000 }, tVi, "vi")).toMatch(/^\d+ vCPU · \d+ GB$/);
    expect(configLine(node("web-server", { cpu: 2, memoryGb: 4 }), meta("web-server"), { baseRps: 1000 }, tVi, "vi")).toBe("2 vCPU · 4 GB");
    expect(configLine(node("postgres", { readReplicas: 1 }), meta("postgres"), { baseRps: 1000 }, tVi, "vi")).toBe("1 chính · 1 bản sao đọc");
    expect(configLine(node("postgres"), meta("postgres"), { baseRps: 1000 }, tEn, "en")).toBe("1 primary · no read replicas");
    expect(configLine(node("lb"), meta("lb"), { baseRps: 1000 }, tVi, "vi")).toBe("Lần lượt từng máy");
    expect(configLine(node("client"), meta("client"), { baseRps: 12000 }, tVi, "vi")).toBe("12.000 yêu cầu/giây");
    expect(configLine(node("client"), meta("client"), { baseRps: 12000 }, tEn, "en")).toBe("12,000 requests/s");
  });
  it("falls back to the kind when the engine does not know it", () => {
    expect(configLine(node("redis"), null, { baseRps: 1 }, tEn, "en")).toBe("redis");
  });
});

describe("costLine (body line 3 while editing)", () => {
  it("shows the monthly cost, free, or no price yet", () => {
    expect(costLine(45.4, tVi, "vi")).toBe("45 $/tháng");
    expect(costLine(1200, tEn, "en")).toBe("$1,200/mo");
    expect(costLine(0, tVi, "vi")).toBe("Miễn phí");
    expect(costLine(null, tVi, "vi")).toBe("Chưa có giá");
    expect(costLine(undefined, tEn, "en")).toBe("No price yet");
  });
});
