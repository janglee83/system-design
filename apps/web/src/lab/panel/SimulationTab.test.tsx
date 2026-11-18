// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useToasts } from "@/ui/toast-store";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { fourTier } from "../../test/engine-fixtures";
import type { EngineClient } from "../../engine/client";
import type { RunRecord } from "../store/run-store";
import { SimulationTab } from "./SimulationTab";

const download = vi.fn();
vi.mock("@/ui/download", () => ({ downloadText: (...a: unknown[]) => download(...a) }));
afterEach(() => {
  useToasts.setState({ toasts: [] });
  download.mockClear();
  vi.unstubAllGlobals();
});
const toasts = () => useToasts.getState().toasts.map((x) => x.message);

const run = (epoch: number): RunRecord =>
  ({ id: 3, engineRunId: 1, epoch, startedAt: 0, input: fourTier(), metrics: {}, events: [], traces: [], elapsedMs: 1, snapshot: { nodes: [], edges: [], warnings: [] } }) as unknown as RunRecord;

function setup(epoch: number, current: number, client: Partial<EngineClient> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <SimulationTab run={run(epoch)} epoch={current} engineVersion="0.1.0" client={client as EngineClient} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

describe("SimulationTab", () => {
  it("shows the input and the engine version", () => {
    setup(4, 4);
    expect(screen.getByText("Simulator version 0.1.0")).toBeInTheDocument();
    expect(screen.getByTestId("sim-input")).toHaveTextContent('"durationMs": 10000');
    expect(screen.getByRole("button", { name: "Export run (JSON)" })).toBeEnabled();
  });

  it("a run from before an engine restart cannot be exported, and says to run again", () => {
    setup(3, 4);
    expect(screen.getByRole("button", { name: "Export run (JSON)" })).toBeDisabled();
    expect(screen.getByText(/Run again to inspect/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy input" })).toBeEnabled(); // the input is still here
  });

  it("exports the run with the engine's result", async () => {
    setup(4, 4, { request: vi.fn(() => Promise.resolve('{"metrics":{}}')) as never });
    await userEvent.click(screen.getByRole("button", { name: "Export run (JSON)" }));
    await vi.waitFor(() => expect(download).toHaveBeenCalledOnce());
    expect(download.mock.calls[0]![0]).toBe("sd-lab-run-3.json");
  });

  it("tells an unreadable result apart from a run the engine no longer holds", async () => {
    setup(4, 4, { request: vi.fn(() => Promise.resolve("not json")) as never });
    await userEvent.click(screen.getByRole("button", { name: "Export run (JSON)" }));
    await vi.waitFor(() => expect(toasts()[0]).toMatch(/^The run could not be exported: /));
    expect(download).not.toHaveBeenCalled();
  });

  it("says to run again when the engine no longer has the run", async () => {
    setup(4, 4, { request: vi.fn(() => Promise.reject(new Error("unknown run 1"))) as never });
    await userEvent.click(screen.getByRole("button", { name: "Export run (JSON)" }));
    await vi.waitFor(() => expect(toasts()).toEqual(["Run again to inspect: the simulator restarted after this run."]));
  });

  it("copying without a clipboard says so instead of throwing", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    setup(4, 4);
    await userEvent.click(screen.getByRole("button", { name: "Copy input" }));
    await vi.waitFor(() => expect(toasts()).toEqual(["Could not copy. Select the text and copy it by hand."]));
  });
});
