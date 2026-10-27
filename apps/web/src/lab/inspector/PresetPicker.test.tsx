// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "../../test/jsdom-radix";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { listPresets } from "../designs/db";
import { emptyDesign } from "../model/design";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi } from "../store/LabStores";
import { PresetPicker } from "./PresetPicker";

let api!: DesignStore;
function Grab() {
  api = useDesignApi();
  return null;
}
function setup() {
  const d = emptyDesign();
  d.workload = { ...d.workload, params: { keep: 1 } };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <LabStoresProvider initial={d}>
          <Grab />
          <PresetPicker />
        </LabStoresProvider>
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

describe("PresetPicker", () => {
  it("applies a built-in preset in one step and keeps the params", async () => {
    setup();
    await userEvent.click(screen.getByRole("combobox", { name: "Preset" }));
    await userEvent.click(screen.getByRole("option", { name: "Flash sale" }));
    expect(api.getState().design.workload).toMatchObject({ baseRps: 8000, surge: { factor: 3 }, params: { keep: 1 } });
    expect(api.getState().past).toHaveLength(1);
  });

  it("saves the current traffic as a named preset without params", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Save current traffic as a preset" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Preset name" }), "Night shift{Enter}");
    const saved = await vi.waitFor(async () => {
      const p = (await listPresets()).find((x) => x.name === "Night shift");
      if (!p) throw new Error("not saved yet");
      return p;
    });
    expect(saved.workload).toMatchObject({ baseRps: 1000 });
    expect("params" in saved.workload).toBe(false);
    await userEvent.click(screen.getByRole("combobox", { name: "Preset" }));
    expect(await screen.findByRole("option", { name: "Night shift" })).toBeInTheDocument();
  });
});
