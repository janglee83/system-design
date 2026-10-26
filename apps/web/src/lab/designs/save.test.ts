import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { emptyDesign } from "../model/design";
import { createDesignStore } from "../store/design-store";
import { createDocStore } from "../store/doc-store";
import { getDesign, getKv, listDesigns } from "./db";
import { duplicateSaved, openSaved, renameSaved, saveAs, saveCurrent } from "./save";
import type { Draft } from "./use-autosave";

function stores(seed = 1) {
  return { design: createDesignStore({ ...emptyDesign(), seed }), doc: createDocStore() };
}

describe("saving designs", () => {
  it("first save creates a named design; the next save updates it in place", async () => {
    const s = stores(5);
    const id = await saveCurrent(s, "Shop v1");
    expect(s.doc.getState()).toMatchObject({ savedId: id, dirty: false });
    expect(s.design.getState().design.name).toBe("Shop v1");
    const first = (await getDesign(id))!;
    expect(first).toMatchObject({ name: "Shop v1", design: { seed: 5, name: "Shop v1" } });
    s.design.getState().apply((d) => ({ ...d, seed: 6 }));
    expect(await saveCurrent(s)).toBe(id);
    const second = (await getDesign(id))!;
    expect(second.design.seed).toBe(6);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
  });

  it("writes the draft at once, so a reload right after saving keeps the work", async () => {
    const s = stores(9);
    const id = await saveCurrent(s, "Now");
    const draft = await getKv<Draft>("draft");
    expect(draft).toMatchObject({ savedId: id, design: { seed: 9, name: "Now" } });
  });

  it("save as makes a separate design", async () => {
    const s = stores();
    const a = await saveCurrent(s, "A");
    const b = await saveAs(s, "B");
    expect(b).not.toBe(a);
    expect(s.doc.getState().savedId).toBe(b);
    expect((await getDesign(a))!.name).toBe("A");
  });

  it("opens a saved design with a fresh history, and renames and duplicates", async () => {
    const s = stores(3);
    const id = await saveCurrent(s, "Keep");
    const t = stores(7);
    t.design.getState().apply((d) => ({ ...d, seed: 8 }));
    await openSaved(t, id);
    expect(t.design.getState().design.seed).toBe(3);
    expect(t.design.getState().past).toEqual([]);
    expect(t.doc.getState()).toMatchObject({ savedId: id, dirty: false });
    await renameSaved(id, "Kept");
    expect((await getDesign(id))!.design.name).toBe("Kept");
    const copy = await duplicateSaved(id, "copy");
    expect((await getDesign(copy))!.name).toBe("Kept (copy)");
    expect((await listDesigns()).map((d) => d.id)).toContain(copy);
  });

  it("refuses to save without a name for a design that was never saved", async () => {
    await expect(saveCurrent(stores())).rejects.toThrow(/name/);
  });
});
