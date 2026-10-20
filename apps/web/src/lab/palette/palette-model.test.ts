import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { METAS } from "../../test/metas";
import { paletteGroups } from "./palette-model";

const tEn = createTranslator({ locale: "en", messages: en });
const tVi = createTranslator({ locale: "vi", messages: vi });

describe("palette model", () => {
  it("groups by category in a fixed order", () => {
    const g = paletteGroups(METAS, { query: "", t: tEn });
    expect(g.map((x) => x.category)).toEqual(["general", "compute", "data"]);
    expect(g[0]!.items.map((i) => i.kind)).toEqual(["client", "lb"]);
  });

  it("finds components by name, description or kind, ignoring accents", () => {
    // "máy chủ" alone also matches the load balancer's description; the full name is unique.
    expect(paletteGroups(METAS, { query: "may chu web", t: tVi }).flatMap((g) => g.items.map((i) => i.kind))).toEqual(["web-server"]);
    expect(paletteGroups(METAS, { query: "replica", t: tEn }).flatMap((g) => g.items.map((i) => i.kind))).toEqual(["postgres"]);
    expect(paletteGroups(METAS, { query: "lb", t: tEn }).flatMap((g) => g.items.map((i) => i.kind))).toEqual(["lb"]);
    expect(paletteGroups(METAS, { query: "zzz", t: tEn })).toEqual([]);
  });

  it("marks kinds a challenge does not allow", () => {
    const g = paletteGroups(METAS, { query: "", t: tEn, allowedKinds: ["client", "web-server"] });
    const allowed = Object.fromEntries(g.flatMap((x) => x.items.map((i) => [i.kind, i.allowed])));
    expect(allowed).toEqual({ client: true, lb: false, "web-server": true, postgres: false });
  });
});
