import { describe, expect, it, vi } from "vitest";

// The web build's init() is replaced so the first load fails and the second succeeds.
const init = vi.fn();
vi.mock("../wasm/web/sim_wasm.js", () => ({ default: init, engineVersion: () => "test" }));

describe("loadSim", () => {
  it("does not cache a failed load, so a later call retries", async () => {
    const { loadSim } = await import("../src/web");
    init.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({});

    await expect(loadSim()).rejects.toThrow("network down");
    const sim = await loadSim();
    expect(sim.engineVersion()).toBe("test");
    expect(init).toHaveBeenCalledTimes(2);

    // Once loaded, the result is cached.
    expect(await loadSim()).toBe(sim);
    expect(init).toHaveBeenCalledTimes(2);
  });
});
