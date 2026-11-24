import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { loadDraft } from "./use-autosave";
import { deleteDesign, deletePreset, getDesign, getKv, listDesigns, listPresets, openLabDb, putDesign, putPreset, setKv } from "./db";

describe("lab database", () => {
  it("creates the three stores", async () => {
    const db = await openLabDb();
    expect([...db.objectStoreNames].sort()).toEqual(["designs", "kv", "presets"]);
  });

  it("saves, lists and deletes user presets", async () => {
    const w = { profile: "mixed" as const, baseRps: 500, writeRatio: 0.1, clients: 10, clientTimeoutMs: 900, surge: null };
    await putPreset({ id: "u1", name: "Night", workload: w });
    expect((await listPresets()).map((p) => p.name)).toContain("Night");
    await deletePreset("u1");
    expect((await listPresets()).map((p) => p.id)).not.toContain("u1");
  });

  it("keeps small key/value settings", async () => {
    await setKv("settings", { a: 1 });
    expect(await getKv("settings")).toEqual({ a: 1 });
    expect(await getKv("missing")).toBeUndefined();
  });
});

describe("saved designs", () => {
  it("lists newest first and has no count limit", async () => {
    for (let i = 0; i < 120; i++) {
      await putDesign({ id: `d${i}`, name: `D${i}`, createdAt: i, updatedAt: i, design: emptyDesign(`D${i}`) });
    }
    const all = await listDesigns();
    expect(all.length).toBeGreaterThanOrEqual(120);
    expect(all[0]!.id).toBe("d119");
    await deleteDesign("d119");
    expect(await getDesign("d119")).toBeUndefined();
  });
});

describe("stored presets are checked on load", () => {
  it("skips entries that are not valid presets", async () => {
    const db = await openLabDb();
    await db.put("presets", { id: "bad1", name: "Broken", workload: { baseRps: "lots" } } as never);
    await db.put("presets", { id: "bad2" } as never);
    const w = { profile: "mixed" as const, baseRps: 300, writeRatio: 0.2, clients: 10, clientTimeoutMs: 1000, surge: null };
    await putPreset({ id: "ok", name: "Fine", workload: w });
    const ids = (await listPresets()).map((p) => p.id);
    expect(ids).toContain("ok");
    expect(ids).not.toContain("bad1");
    expect(ids).not.toContain("bad2");
  });
});

describe("stored records are validated when read (review)", () => {
  it("skips a saved design that is not a valid design instead of crashing the Lab", async () => {
    const db = await openLabDb();
    await putDesign({ id: "good", name: "Good", createdAt: 1, updatedAt: 9_000_001, design: emptyDesign("Good") });
    // Written by an older build, another tab, or by hand in devtools.
    await db.put("designs", { id: "bad", name: "Bad", createdAt: 1, updatedAt: 9_000_002, design: { nodes: "oops" } } as never);
    await db.put("designs", { id: "worse", name: 5, updatedAt: "x" } as never);
    const ids = (await listDesigns()).map((d) => d.id);
    expect(ids).toContain("good");
    expect(ids).not.toContain("bad");
    expect(ids).not.toContain("worse");
    expect(await getDesign("bad")).toBeUndefined();
    expect((await getDesign("good"))?.name).toBe("Good");
  });

  it("ignores a damaged draft", async () => {
    await setKv("draft", { design: { designFormatVersion: 1, nodes: [{ id: "__proto__" }] }, savedId: null, at: 1 });
    expect(await loadDraft()).toBeUndefined();
    await setKv("draft", { design: emptyDesign("Ok"), savedId: null, at: 2 });
    expect((await loadDraft())?.design.name).toBe("Ok");
  });
});

