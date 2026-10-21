import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deletePreset, getKv, listPresets, openLabDb, putPreset, setKv } from "./db";

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
