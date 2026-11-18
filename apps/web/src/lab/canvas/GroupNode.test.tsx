// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Node, NodeProps } from "@xyflow/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { meta } from "../../test/metas";
import { emptyDesign } from "../model/design";
import { addNode, groupNodes } from "../model/ops";
import type { DesignStore } from "../store/design-store";
import { LabStoresProvider, useDesign, useDesignApi } from "../store/LabStores";
import { GroupNode } from "./GroupNode";
import type { GroupData } from "./rf-adapter";

let api!: DesignStore;
function Frame() {
  api = useDesignApi();
  const group = useDesign((s) => s.design.groups[0]!);
  const props = { id: group.id, data: { group }, selected: true } as unknown as NodeProps<Node<GroupData>>;
  return <GroupNode {...props} />;
}

function setup() {
  const d = groupNodes(addNode(emptyDesign(), meta("web-server"), { x: 0, y: 0 }).design, ["web-server-1"])!.design;
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LabStoresProvider initial={d}>
        <Frame />
      </LabStoresProvider>
    </NextIntlClientProvider>,
  );
}

describe("GroupNode", () => {
  it("renames on Enter after a double-click", async () => {
    setup();
    await userEvent.dblClick(screen.getByText("Group"));
    await userEvent.type(screen.getByRole("textbox", { name: "Group name" }), "Backend{Enter}");
    expect(api.getState().design.groups[0]!.label).toBe("Backend");
  });

  it("Escape cancels the rename and leaves the label as it was", async () => {
    setup();
    await userEvent.dblClick(screen.getByText("Group"));
    await userEvent.type(screen.getByRole("textbox", { name: "Group name" }), "Oops{Escape}");
    expect(screen.queryByRole("textbox", { name: "Group name" })).toBeNull();
    expect(api.getState().design.groups[0]!.label).toBe("");
    expect(api.getState().past).toHaveLength(0);
  });
});
