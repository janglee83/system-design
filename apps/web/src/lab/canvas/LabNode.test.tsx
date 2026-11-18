// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { ReactFlowProvider, type NodeProps, type Node } from "@xyflow/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import vi from "../../../messages/vi.json";
import { meta } from "../../test/metas";
import { LabNode } from "./LabNode";
import type { LabNodeData } from "./rf-adapter";

function tile(kind: string, over: Partial<LabNodeData> = {}, nodeOver: Partial<LabNodeData["node"]> = {}, selected = false) {
  const data: LabNodeData = {
    node: { id: `${kind}-1`, kind, label: "", replicas: 1, config: {}, position: { x: 0, y: 0 }, groupId: null, ...nodeOver },
    meta: meta(kind),
    locked: false,
    cost: 45,
    issues: { blocking: 0, warnings: 0 },
    ...over,
  };
  const props = { id: data.node.id, data, selected, type: "lab" } as unknown as NodeProps<Node<LabNodeData>>;
  render(
    <NextIntlClientProvider locale="vi" messages={vi}>
      <ReactFlowProvider>
        <LabNode {...props} />
      </ReactFlowProvider>
    </NextIntlClientProvider>,
  );
  return screen.getByTestId(`node-${data.node.id}`);
}

describe("LabNode (design-system §5, 1A)", () => {
  it("shows the art, the name, the configuration and the monthly cost", () => {
    const el = tile("web-server", {}, { config: { cpu: 2, memoryGb: 4 } });
    expect(el.querySelector(".sd-node-art svg")).not.toBeNull();
    expect(el).toHaveTextContent("Máy chủ web 1");
    expect(el).toHaveTextContent("2 vCPU · 4 GB");
    expect(el).toHaveTextContent("45 $/tháng");
    expect(el.style.getPropertyValue("--k")).toBe("var(--sd-cat-compute)");
  });

  it("shows the replicas badge and the stacked copies only with more than one replica", () => {
    const one = tile("web-server");
    expect(one).not.toHaveTextContent("×");
    expect(one).not.toHaveAttribute("data-replicas");
    cleanup();
    const two = tile("web-server", {}, { id: "web-server-2", replicas: 2 });
    expect(two).toHaveTextContent("×2");
    expect(two).toHaveAttribute("data-replicas");
  });

  it("has no in-port for a kind that accepts nothing, and both ports otherwise", () => {
    tile("client", { cost: 0 });
    expect(screen.queryByTestId("handle-in-client-1")).toBeNull();
    expect(screen.getByTestId("handle-out-client-1")).toHaveClass("sd-port");
    expect(screen.getByTestId("node-client-1")).toHaveTextContent("Miễn phí");
  });

  it("marks selection and lock, and names the badges", () => {
    const el = tile("postgres", { locked: true, issues: { blocking: 1, warnings: 1 } }, {}, true);
    expect(el).toHaveAttribute("data-selected");
    expect(el).toHaveAttribute("data-locked");
    expect(screen.getByRole("img", { name: "Thử thách đã khóa thành phần này" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 vấn đề" })).toHaveTextContent("2");
  });

  it("shows a running state with an icon and a word, not only colour", () => {
    const el = tile("web-server", { state: "overloaded" });
    expect(el).toHaveAttribute("data-state", "overloaded");
    expect(el.querySelector(".sd-node-chip")).toHaveTextContent("Quá tải");
  });
});
