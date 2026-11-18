// @vitest-environment jsdom
import { sim } from "@sd/sim/node";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { emptyDesign } from "../model/design";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi } from "../store/LabStores";
import { WorldParams } from "./WorldParams";

const DEFAULTS = sim.defaultCalibration();
let api!: DesignStore;
function Grab() {
  api = useDesignApi();
  return null;
}
async function setup() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <LabStoresProvider initial={emptyDesign()}>
          <Grab />
          <WorldParams defaults={DEFAULTS} />
        </LabStoresProvider>
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: /World parameters/ }));
}
const field = (name: string) => screen.getByRole("spinbutton", { name });
async function set(name: string, v: string) {
  await userEvent.clear(field(name));
  await userEvent.type(field(name), `${v}{Enter}`);
}
const row = (key: string) => screen.getByTestId(`world-${key}`);

describe("WorldParams", () => {
  it("shows every field at its default", async () => {
    await setup();
    for (const [key, value] of Object.entries(DEFAULTS)) {
      expect(within(row(key)).getByRole("spinbutton")).toHaveValue(String(value));
      expect(row(key)).toHaveAttribute("data-changed", "false");
    }
  });

  it("stores only a changed value, marks the row and counts it", async () => {
    await setup();
    await set("Web: time to serve a request (ms)", "8");
    expect(api.getState().design.calibration).toEqual({ webServiceMs: 8 });
    expect(row("webServiceMs")).toHaveAttribute("data-changed", "true");
    expect(within(row("webServiceMs")).getByRole("button", { name: "Reset to default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /World parameters/ })).toHaveTextContent("1 changed");
  });

  it("resets one row, and resets all in one step", async () => {
    await setup();
    await set("Web: time to serve a request (ms)", "8");
    await userEvent.click(within(row("webServiceMs")).getByRole("button", { name: "Reset to default" }));
    expect(api.getState().design.calibration).toEqual({});
    await set("Web: time to serve a request (ms)", "8");
    await set("PostgreSQL: time to promote a replica (ms)", "500");
    const steps = api.getState().past.length;
    await userEvent.click(screen.getByRole("button", { name: "Reset all" }));
    expect(api.getState().design.calibration).toEqual({});
    expect(api.getState().past).toHaveLength(steps + 1);
  });

  it("typing the default back removes the override", async () => {
    await setup();
    await set("Web: time to serve a request (ms)", "8");
    await set("Web: time to serve a request (ms)", String(DEFAULTS.webServiceMs));
    expect(api.getState().design.calibration).toEqual({});
  });
});
