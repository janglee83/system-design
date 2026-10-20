// @vitest-environment jsdom
import "../../test/jsdom-radix";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { emptyDesign } from "../model/design";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi } from "../store/LabStores";
import { WorkloadForm } from "./WorkloadForm";

let api!: DesignStore;
function Grab() {
  api = useDesignApi();
  return null;
}
function setup() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LabStoresProvider initial={emptyDesign()}>
        <Grab />
        <TooltipProvider>
          <WorkloadForm workloadParams={[]} />
        </TooltipProvider>
      </LabStoresProvider>
    </NextIntlClientProvider>,
  );
}
const d = () => api.getState().design;
async function set(name: string, value: string) {
  const input = screen.getByRole("spinbutton", { name });
  await userEvent.clear(input);
  await userEvent.type(input, `${value}{Enter}`);
}

describe("WorkloadForm", () => {
  it("sets the request rate and the share of writes (shown in percent)", async () => {
    setup();
    await set("Total requests per second", "2500");
    expect(d().workload.baseRps).toBe(2500);
    await set("Share of writes", "30");
    expect(d().workload.writeRatio).toBe(0.3);
  });

  it("turns the surge on with defaults and off again", async () => {
    setup();
    await userEvent.click(screen.getByRole("switch", { name: "Traffic surge" }));
    expect(d().workload.surge).toEqual({ factor: 3, atMs: 3000, durationMs: 2000 });
    await set("Surge starts at (s)", "4");
    expect(d().workload.surge?.atMs).toBe(4000);
    await userEvent.click(screen.getByRole("switch", { name: "Traffic surge" }));
    expect(d().workload.surge).toBeNull();
  });

  it("sets the run length in seconds, clamped to 1..600 s", async () => {
    setup();
    await set("Run length (s)", "25");
    expect(d().durationMs).toBe(25_000);
    await set("Run length (s)", "9000");
    expect(d().durationMs).toBe(600_000);
  });

  it("adds a scenario parameter and says the engine does not read it yet", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox", { name: "Parameter name" }), "consumersPerPublisher");
    await userEvent.type(screen.getByRole("spinbutton", { name: "Value" }), "4");
    await userEvent.click(screen.getByRole("button", { name: "Add parameter" }));
    expect(d().workload.params).toEqual({ consumersPerPublisher: 4 });
    const row = screen.getByTestId("param-consumersPerPublisher");
    expect(within(row).getByText(/does not read “consumersPerPublisher” yet/)).toBeInTheDocument();
  });

  it("accepts whole seeds from 0 to 4294967295 only", async () => {
    setup();
    await set("Random seed", "12.7");
    expect(d().seed).toBe(13);
    await set("Random seed", "99999999999");
    expect(d().seed).toBe(4_294_967_295);
    await set("Random seed", "-5");
    expect(d().seed).toBe(0);
  });
});
