import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import curriculum from "../../../../../content/curriculum.json";
import { METAS } from "../../test/metas";
import { CATEGORIES, buildCatalog, canAdd, categoryItems, searchCatalog } from "./palette-model";

const tEn = createTranslator({ locale: "en", messages: en });
const tVi = createTranslator({ locale: "vi", messages: vi });
const PLANNED = curriculum.engine.planned.components;
const cat = (t = tEn, allowedKinds?: string[] | null) => buildCatalog({ metas: METAS, planned: PLANNED, t, allowedKinds });

describe("palette catalogue (design-system §3)", () => {
  it("has seven categories and every drawn kind, with its status", () => {
    expect(CATEGORIES).toEqual(["entry", "compute", "data", "cache", "msg", "storage", "external"]);
    const c = cat();
    expect(c).toHaveLength(21);
    const status = Object.fromEntries(c.map((i) => [i.kind, i.status]));
    for (const m of METAS) expect(status[m.kind], m.kind).toBe("ready");
    expect(status.redis).toBe("planned");
    expect(status.cdn).toBe("planned");
    expect(status.stream).toBe("later");
  });

  it("lists ready kinds first inside a category", () => {
    expect(categoryItems(cat(), "entry").map((i) => i.kind)).toEqual(["client", "lb", "cdn", "api-gateway", "mobile", "dns", "rate-limiter"]);
    expect(categoryItems(cat(), "cache").map((i) => i.kind)).toEqual(["redis", "memcached"]);
  });

  it("searches every category without accents, grouped in category order", () => {
    const r = searchCatalog(cat(tVi), "bo nho dem");
    expect(r.map((g) => g.category)).toEqual(["cache"]);
    expect(r[0]!.items.map((i) => i.kind)).toEqual(["redis", "memcached"]);
    expect(searchCatalog(cat(tVi), "may chu web").flatMap((g) => g.items.map((i) => i.kind))).toEqual(["web-server"]);
    expect(searchCatalog(cat(), "zzz")).toEqual([]);
  });

  it("adds only ready kinds the challenge allows", () => {
    const c = cat(tEn, ["client", "web-server"]);
    const ok = Object.fromEntries(c.map((i) => [i.kind, canAdd(i)]));
    expect(ok.client).toBe(true);
    expect(ok.lb).toBe(false);
    expect(ok.redis).toBe(false);
    expect(c.find((i) => i.kind === "lb")!.allowed).toBe(false);
    expect(canAdd(cat().find((i) => i.kind === "redis")!)).toBe(false);
  });
});
