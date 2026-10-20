// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { META_BY_KIND, meta } from "../../test/metas";
import { emptyDesign } from "../model/design";
import { addNode } from "../model/ops";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesignApi, useUiApi } from "../store/LabStores";
import type { createUiStore } from "../store/ui-store";
import { ConnectDialog } from "./ConnectDialog";

function design() {
  let d = emptyDesign();
  for (const [kind, x] of [["client", 0], ["lb", 240], ["web-server", 480]] as const) d = addNode(d, meta(kind), { x, y: 0 }).design;
  return d;
}

let api!: DesignStore;
let ui!: ReturnType<typeof createUiStore>;
function Grab() {
  api = useDesignApi();
  ui = useUiApi();
  return null;
}

async function setup() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LabStoresProvider initial={design()}>
        <Grab />
        <ConnectDialog metas={META_BY_KIND} />
      </LabStoresProvider>
    </NextIntlClientProvider>,
  );
  act(() => {
    api.getState().select({ nodes: ["client-1"] });
    ui.getState().set({ connectOpen: true });
  });
  return screen.findByRole("dialog");
}

describe("ConnectDialog", () => {
  it("lists every other component under a title naming the source", async () => {
    const dialog = await setup();
    expect(dialog).toHaveAccessibleName("Connect Users 1 to…");
    expect(screen.getAllByRole("option").map((o) => o.firstChild?.textContent)).toEqual(["Load balancer 1", "Web server 1"]);
  });

  it("connects to the option picked with the arrow keys and Enter, then closes", async () => {
    await setup();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(api.getState().design.edges).toEqual([{ id: "e1", from: "client-1", to: "web-server-1", kind: "http" }]);
    expect(ui.getState().connectOpen).toBe(false);
  });

  it("shows why a connection is refused and stays open", async () => {
    await setup();
    act(() => {
      api.getState().select({ nodes: ["web-server-1"] });
    });
    // Options are now Users 1 and Load balancer 1; Users accepts nothing.
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Users 1 does not take incoming connections.");
    expect(ui.getState().connectOpen).toBe(true);
    expect(api.getState().design.edges).toEqual([]);
  });

  it("keeps the active option scrolled into view", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await setup();
    await userEvent.keyboard("{ArrowDown}");
    expect(scroll).toHaveBeenLastCalledWith({ block: "nearest" });
    expect(scroll.mock.contexts.at(-1)).toHaveTextContent("Web server 1");
  });

  it("closes when the source component goes away", async () => {
    await setup();
    act(() => api.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "client-1") })));
    expect(ui.getState().connectOpen).toBe(false);
  });
});
