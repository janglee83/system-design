// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EngineClient } from "./client";
import { EngineProvider, useEngineStart, useEngineStore } from "./EngineProvider";
import { FakeWorker } from "../test/engine-fixtures";

function Probe() {
  useEngineStart();
  const status = useEngineStore((s) => s.status);
  return <p data-testid="status">{status}</p>;
}

describe("EngineProvider", () => {
  it("reaches ready under StrictMode's mount, unmount and remount", async () => {
    const workers: FakeWorker[] = [];
    render(
      <StrictMode>
        <EngineProvider makeClient={() => new EngineClient(() => (workers.push(new FakeWorker()), workers.at(-1)!))}>
          <Probe />
        </EngineProvider>
      </StrictMode>,
    );
    await expect.poll(() => screen.getByTestId("status").textContent).toBe("ready");
    // StrictMode ran the effects twice: the first worker was stopped, the live one is the last.
    expect(workers.length).toBeGreaterThanOrEqual(2);
    expect(workers.slice(0, -1).every((w) => w.terminated)).toBe(true);
    expect(workers.at(-1)!.terminated).toBe(false);
  });

  describe("the e2e engine hook", () => {
    afterEach(() => vi.unstubAllEnvs());
    const hook = () => (window as unknown as { __sdEngine?: unknown }).__sdEngine;
    const mount = () =>
      render(
        <EngineProvider makeClient={() => new EngineClient(() => new FakeWorker())}>
          <Probe />
        </EngineProvider>,
      );

    it("is absent from normal builds, even under automation", () => {
      Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
      mount();
      expect(hook()).toBeUndefined();
    });

    it("exists only in e2e builds and is removed on unmount", () => {
      vi.stubEnv("NEXT_PUBLIC_E2E", "1");
      const { unmount } = mount();
      expect(hook()).toBeDefined();
      unmount();
      expect(hook()).toBeUndefined();
    });
  });
});
