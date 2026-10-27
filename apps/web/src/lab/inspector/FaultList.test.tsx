// @vitest-environment jsdom
import "../../test/jsdom-radix";
import type { FaultKind } from "@sd/sim";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { META_BY_KIND, meta } from "../../test/metas";
import { emptyDesign, type Design } from "../model/design";
import { randomFault } from "../model/faults";
import { addNode } from "../model/ops";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi } from "../store/LabStores";
import { FaultList } from "./FaultList";

const SUPPORTED: FaultKind[] = ["traffic-surge-3x", "instance-down", "lb-node-down", "db-primary-down"];

function design(): Design {
  let d = emptyDesign();
  for (const k of ["client", "lb", "web-server", "web-server", "postgres"]) d = addNode(d, meta(k), { x: 0, y: 0 }).design;
  return d;
}

let api!: DesignStore;
function Grab() {
  api = useDesignApi();
  return null;
}
function setup() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <LabStoresProvider initial={design()}>
          <Grab />
          <FaultList supported={SUPPORTED} metas={META_BY_KIND} />
        </LabStoresProvider>
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}
const faults = () => api.getState().design.faults;

describe("FaultList", () => {
  it("adds the first supported fault that has targets, at 30% of the run", async () => {
    setup();
    expect(screen.getByText("No faults. The run will be calm.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    expect(faults()).toEqual([{ kind: "instance-down", target: null, atMs: 3000 }]);
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    expect(faults()).toHaveLength(2);
  });

  it("lists every kind; unsupported kinds are disabled and say they are coming soon", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Fault" }));
    expect(screen.getAllByRole("option")).toHaveLength(14);
    const cache = screen.getByRole("option", { name: /The cache goes down/ });
    expect(cache).toHaveAttribute("aria-disabled", "true");
    expect(cache).toHaveTextContent("Coming soon");
    expect(screen.getByRole("option", { name: /A server goes down/ })).not.toHaveAttribute("aria-disabled");
  });

  it("changes the target to a node of the matching role", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Target" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Any matching (the simulator picks)", "Web server 1", "Web server 2"]);
    await userEvent.click(screen.getByRole("option", { name: "Web server 2" }));
    expect(faults()[0]!.target).toBe("web-server-2");
  });

  it("adds exactly the seeded random fault, and removes a row", async () => {
    setup();
    const expected = randomFault(api.getState().design, META_BY_KIND, SUPPORTED);
    await userEvent.click(screen.getByRole("button", { name: "Random fault" }));
    expect(faults()).toEqual([expected]);
    const row = screen.getByTestId("fault-0");
    await userEvent.click(within(row).getByRole("button", { name: "Remove fault" }));
    expect(faults()).toEqual([]);
  });

  it("sets the time in seconds", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    const at = screen.getByRole("spinbutton", { name: "At (s)" });
    await userEvent.clear(at);
    await userEvent.type(at, "4.5{Enter}");
    act(() => {});
    expect(faults()[0]!.atMs).toBe(4500);
  });

  it("keeps each row's element when an earlier row is removed (stable keys)", async () => {
    setup();
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    const second = screen.getByTestId("fault-1");
    await userEvent.click(within(screen.getByTestId("fault-0")).getByRole("button", { name: "Remove fault" }));
    expect(faults()).toHaveLength(2);
    expect(screen.getByTestId("fault-0")).toBe(second);
  });

  it("offers fault times up to the run length, on whole tenths of a second", async () => {
    setup();
    act(() => api.getState().apply((d) => ({ ...d, durationMs: 12_345 })));
    await userEvent.click(screen.getByRole("button", { name: "Add fault" }));
    expect(screen.getByRole("spinbutton", { name: "At (s)" })).toHaveAttribute("aria-valuemax", "12.3");
  });
});
