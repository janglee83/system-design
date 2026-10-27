// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import type { RunRecord } from "../store/run-store";
import { SeriesChart } from "./SeriesChart";

vi.mock("uplot", () => {
  throw new Error("chunk failed to load");
});

class NoResize {
  observe() {}
  disconnect() {}
}

describe("SeriesChart", () => {
  it("keeps the readable summary when the chart library fails to load", async () => {
    vi.stubGlobal("ResizeObserver", NoResize);
    const run = {
      timeline: { frames: 2, frameMs: 100, nodeIds: ["web"], value: () => 0.5 },
    } as unknown as RunRecord;
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SeriesChart run={run} nodeId="web" label="Over time: web" />
      </NextIntlClientProvider>,
    );
    await new Promise((r) => setTimeout(r, 20)); // an unhandled rejection would fail the run here
    expect(screen.getByRole("figure", { name: "Over time: web" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Busy" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
