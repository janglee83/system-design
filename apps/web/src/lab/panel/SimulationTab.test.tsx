// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { fourTier } from "../../test/engine-fixtures";
import type { EngineClient } from "../../engine/client";
import type { RunRecord } from "../store/run-store";
import { SimulationTab } from "./SimulationTab";

const run = (epoch: number): RunRecord =>
  ({ id: 3, engineRunId: 1, epoch, startedAt: 0, input: fourTier(), metrics: {}, events: [], traces: [], elapsedMs: 1 }) as unknown as RunRecord;

function setup(epoch: number, current: number) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <SimulationTab run={run(epoch)} epoch={current} engineVersion="0.1.0" client={{} as EngineClient} />
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
});
