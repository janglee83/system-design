import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { flatten, icuArgs } from "./flatten";
import { SAME_IN_BOTH } from "./same-in-both";

const fv = flatten(vi);
const fe = flatten(en);

describe("message catalogs", () => {
  it("have the same keys in both languages", () => {
    expect(Object.keys(fv).filter((k) => !(k in fe))).toEqual([]);
    expect(Object.keys(fe).filter((k) => !(k in fv))).toEqual([]);
  });

  it("use the same ICU arguments in both languages", () => {
    const diff = Object.keys(fe)
      .filter((k) => k in fv)
      .filter((k) => icuArgs(fe[k]!).join() !== icuArgs(fv[k]!).join());
    expect(diff).toEqual([]);
  });

  it("have no empty values", () => {
    expect(Object.entries({ ...fv, ...fe }).filter(([, v]) => v.trim() === "").map(([k]) => k)).toEqual([]);
  });

  it("do not leave English inside Vietnamese text", () => {
    const same = Object.keys(fv).filter((k) => fv[k] === fe[k] && fv[k]!.length > 12 && !SAME_IN_BOTH.has(k));
    expect(same).toEqual([]);
  });

  it("extracts ICU argument names, including plural arguments", () => {
    expect(icuArgs("{node}: {count, plural, one {# replica} other {# replicas}} left")).toEqual(["count", "node"]);
    expect(icuArgs("no arguments")).toEqual([]);
  });
});
