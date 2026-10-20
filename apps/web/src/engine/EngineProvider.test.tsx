// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { EngineClient } from "./client";
import { EngineProvider, useEngineStart, useEngineStore } from "./EngineProvider";
import { FakeWorker } from "./test-fixtures";

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
});
