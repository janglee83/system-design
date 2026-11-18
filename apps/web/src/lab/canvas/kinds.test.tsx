import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ART_FILES, ART_SOURCE, ART_TARGET } from "../../../scripts/import-node-art.mjs";
import { METAS } from "../../test/metas";
import { NodeArt } from "./art/NodeArt";
import { categoryColor, categoryOf, KINDS, kindArt } from "./kinds";

describe("node art (design-system §5, §12)", () => {
  it("is an unedited copy of the design assets (run pnpm art:import after they change)", () => {
    for (const f of ART_FILES) {
      expect(fs.readFileSync(path.join(ART_TARGET, f), "utf8"), f).toBe(fs.readFileSync(path.join(ART_SOURCE, f), "utf8"));
    }
  });

  it("draws every listed kind, ready, planned or later", () => {
    expect(KINDS.size).toBe(21);
    for (const k of KINDS.keys()) {
      const art = kindArt(k);
      expect(art, k).not.toBeNull();
      expect(renderToStaticMarkup(<NodeArt kind={art!} />), k).toMatch(/<(path|rect|circle|ellipse)/);
    }
  });

  it("lists every kind the engine has as ready", () => {
    for (const m of METAS) expect(KINDS.get(m.kind)?.status, m.kind).toBe("ready");
  });

  it("has no art for a kind it does not list", () => {
    expect(kindArt("teleporter")).toBeNull();
  });
});

describe("category accents (design-system §1.1)", () => {
  it("maps kinds to their category", () => {
    expect(categoryOf("client")).toBe("entry");
    expect(categoryOf("rate-limiter")).toBe("entry");
    expect(categoryOf("web-server")).toBe("compute");
    expect(categoryOf("read-replica")).toBe("data");
    expect(categoryOf("memcached")).toBe("cache");
    expect(categoryOf("stream")).toBe("msg");
    expect(categoryOf("object-storage")).toBe("storage");
    expect(categoryOf("third-party")).toBe("external");
  });
  it("falls back to external for an unknown kind", () => {
    expect(categoryOf("teleporter")).toBe("external");
    expect(categoryColor("teleporter")).toBe("var(--sd-cat-external)");
    expect(categoryColor("redis")).toBe("var(--sd-cat-cache)");
  });
});
