// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDesign } from "../model/design";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi, useDocApi } from "../store/LabStores";
import type { createDocStore } from "../store/doc-store";
import { AUTOSAVE_MS, useAutosave } from "./use-autosave";

const setKv = vi.fn<(key: string, value: unknown) => Promise<void>>(() => Promise.resolve());
vi.mock("./db", () => ({ setKv: (k: string, v: unknown) => setKv(k, v), getKv: () => Promise.resolve(undefined) }));

let api!: DesignStore;
let doc!: ReturnType<typeof createDocStore>;
function Auto() {
  api = useDesignApi();
  doc = useDocApi();
  useAutosave();
  return null;
}

afterEach(() => {
  vi.useRealTimers();
  setKv.mockClear();
});

describe("useAutosave", () => {
  it("writes the draft 1 s after the last change, once for quick changes, and marks the doc dirty", () => {
    vi.useFakeTimers();
    render(
      <LabStoresProvider initial={emptyDesign()}>
        <Auto />
      </LabStoresProvider>,
    );
    act(() => {
      api.getState().apply((d) => ({ ...d, seed: 2 }));
    });
    expect(doc.getState().dirty).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      api.getState().apply((d) => ({ ...d, seed: 3 }));
    });
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_MS - 1);
    });
    expect(setKv).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(setKv).toHaveBeenCalledOnce();
    expect(setKv.mock.calls[0]![0]).toBe("draft");
    expect((setKv.mock.calls[0]![1] as { design: { seed: number } }).design.seed).toBe(3);
  });
});
