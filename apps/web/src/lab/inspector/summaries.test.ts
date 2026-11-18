import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { METAS, meta } from "../../test/metas";
import { emptyDesign } from "../model/design";
import { advancedSummary, configSummary, connectionsSummary, costBreakdown, faultsSummary, runSummary, workloadSummary } from "./summaries";

const tVi = createTranslator({ locale: "vi", messages: vi });
const tEn = createTranslator({ locale: "en", messages: en });
const node = (kind: string, config: Record<string, number | string> = {}, replicas = 1) => ({ id: `${kind}-1`, kind, label: "", replicas, config });

describe("inspector section summaries (design-system §4.1)", () => {
  it("summarise the configuration of every engine kind, with replicas", () => {
    expect(configSummary(node("web-server", { cpu: 1, memoryGb: 2 }, 2), meta("web-server"), 1000, tVi, "vi")).toBe("1 vCPU · 2 GB · ×2");
    expect(configSummary(node("web-server", { cpu: 4, memoryGb: 8 }), meta("web-server"), 1000, tVi, "vi")).toBe("4 vCPU · 8 GB");
    expect(configSummary(node("postgres", { readReplicas: 2 }), meta("postgres"), 1000, tVi, "vi")).toBe("1 chính · 2 bản sao đọc");
    expect(configSummary(node("lb", { algorithm: "least-conn" }), meta("lb"), 1000, tEn, "en")).toBe(tEn("configOption.algorithm.least-conn"));
    // Every engine field is covered: each kind's summary changes when any of its fields changes.
    for (const m of METAS) {
      for (const f of m.fields) {
        const other = f.kind === "choice" ? f.options.find((o) => o !== f.default)! : Number(f.default) + 1;
        const a = configSummary(node(m.kind), m, 1000, tEn, "en");
        const b = configSummary(node(m.kind, { [f.key]: other }), m, 1000, tEn, "en");
        expect(b, `${m.kind}.${f.key}`).not.toBe(a);
      }
    }
  });

  it("say when no override is set", () => {
    expect(advancedSummary(node("web-server"), ["serviceMs", "costPerMonth"], tVi)).toBe("Theo tham số thế giới");
    expect(advancedSummary(node("web-server", { serviceMs: 5 }), ["serviceMs", "costPerMonth"], tEn)).toBe("1 own value");
  });

  it("break the monthly cost down by instance", () => {
    expect(costBreakdown(45, 2, tVi, "vi")).toBe("2 máy × 22,5 $");
    expect(costBreakdown(45, 1, tEn, "en")).toBe("1 instance × $45");
    expect(costBreakdown(null, 2, tEn, "en")).toBe("");
  });

  it("count connections in and out", () => {
    expect(connectionsSummary(1, 2, tVi)).toBe("1 vào · 2 ra");
    expect(connectionsSummary(0, 0, tEn)).toBe("No connections");
  });

  it("summarise the design's traffic, run settings and faults", () => {
    const d = emptyDesign();
    expect(workloadSummary(d.workload, tVi, "vi")).toBe("1.000 yêu cầu/giây · 20% ghi");
    expect(runSummary(d.durationMs, d.seed, tEn)).toBe("10 s · seed 1");
    expect(faultsSummary(0, tVi)).toBe("Không có sự cố");
    expect(faultsSummary(2, tEn)).toBe("2 faults");
  });
});
