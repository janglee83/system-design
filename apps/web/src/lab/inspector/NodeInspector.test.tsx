// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { META_BY_KIND, meta } from "../../test/metas";
import { emptyDesign, type Design } from "../model/design";
import { addNode, connect } from "../model/ops";
import type { createCheckStore } from "../store/check-store";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useCheckApi, useDesignApi } from "../store/LabStores";
import { NodeInspector } from "./NodeInspector";

const OVERRIDES = ["costPerMonth", "rpsPerInstance", "serviceMs"];

function design(locked: string[] = []): Design {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
  d = (connect(d, "client-1", "web-server-1", META_BY_KIND) as { design: Design }).design;
  return { ...d, locked };
}

let api!: DesignStore;
let check!: ReturnType<typeof createCheckStore>;
function Grab() {
  api = useDesignApi();
  check = useCheckApi();
  return null;
}

function setup(d = design()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LabStoresProvider initial={d}>
        <Grab />
        <NodeInspector nodeId="web-server-1" metas={META_BY_KIND} overrideKeys={OVERRIDES} />
      </LabStoresProvider>
    </NextIntlClientProvider>,
  );
  return screen.getByTestId("node-inspector");
}
const node = () => api.getState().design.nodes.find((n) => n.id === "web-server-1")!;

describe("NodeInspector", () => {
  it("changes replicas", async () => {
    const panel = setup();
    const replicas = within(panel).getByRole("spinbutton", { name: "Replicas" });
    await userEvent.clear(replicas);
    await userEvent.type(replicas, "3{Enter}");
    expect(node().replicas).toBe(3);
  });

  it("shows the node's monthly cost from the check store", () => {
    const panel = setup();
    act(() => check.getState().finish(check.getState().begin(), { issues: [], costs: { "web-server-1": 140 } }));
    expect(within(panel).getByTestId("node-cost")).toHaveTextContent("$140");
  });

  it("sets and clears a per-node override under Advanced", async () => {
    const panel = setup();
    await userEvent.click(within(panel).getByRole("button", { name: "Advanced" }));
    const serviceMs = within(panel).getByRole("spinbutton", { name: "Service time (ms)" });
    await userEvent.type(serviceMs, "250{Enter}");
    expect(node().config).toEqual({ serviceMs: 250 });
    await userEvent.clear(serviceMs);
    await userEvent.tab();
    expect(node().config).toEqual({});
  });

  it("shows the locked notice and disables every control of a locked node", async () => {
    const panel = setup(design(["web-server-1"]));
    expect(panel).toHaveTextContent("The challenge locks this component.");
    await userEvent.click(within(panel).getByRole("button", { name: "Advanced" }));
    const controls = [
      ...within(panel).getAllByRole("textbox"),
      ...within(panel).getAllByRole("spinbutton"),
      ...within(panel).getAllByRole("button", { name: /^(Increase|Decrease) / }),
    ];
    expect(controls.length).toBeGreaterThan(5);
    for (const c of controls) expect(c).toBeDisabled();
  });
});
