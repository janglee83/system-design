import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
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
