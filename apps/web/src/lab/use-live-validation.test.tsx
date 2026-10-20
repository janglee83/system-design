// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { meta } from "../test/metas";
import { LabHarness, type Handles } from "../test/lab-harness";
import { emptyDesign } from "./model/design";
import { addNode } from "./model/ops";
import { useLiveValidation } from "./use-live-validation";

function Live() {
  useLiveValidation();
  return null;
}

function design() {
  let d = emptyDesign();
  d = addNode(d, meta("client"), { x: 0, y: 0 }).design;
  d = addNode(d, meta("web-server"), { x: 240, y: 0 }).design;
  return { ...d, edges: [{ id: "e1", from: "client-1", to: "web-server-1", kind: "http" as const }] };
}

async function setup() {
  const h: Partial<Handles> = {};
  render(
    <LabHarness initial={design()} h={h}>
      <Live />
    </LabHarness>,
  );
  await expect.poll(() => h.check!.getState().status).toBe("done");
  return h as Handles;
}

describe("useLiveValidation", () => {
  it("marks the check stale at once on a change, so Run is blocked until the new result", async () => {
    const h = await setup();
    expect(h.canRun()).toBe(true);
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "client-1"), edges: [] })));
    // Before the 150 ms debounce has fired:
    expect(h.check.getState().status).toBe("checking");
    expect(h.canRun()).toBe(false);
    await expect.poll(() => h.check.getState().status).toBe("done");
    expect(h.check.getState().issues.map((i) => i.code)).toContain("graph.no-client");
    expect(h.canRun()).toBe(false);
  });
});
