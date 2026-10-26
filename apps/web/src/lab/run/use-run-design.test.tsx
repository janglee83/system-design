// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { useToasts } from "@/ui/toast-store";
import { designFromInput, fourTier } from "../../test/engine-fixtures";
import { LabHarness, type Handles } from "../../test/lab-harness";
import { useLiveValidation } from "../use-live-validation";
import { useLabShortcuts } from "../use-shortcuts";
import { useRunDesign } from "./use-run-design";

function Wired() {
  useLiveValidation();
  useLabShortcuts({ run: useRunDesign() });
  return null;
}

async function setup() {
  const h: Partial<Handles> = {};
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LabHarness initial={designFromInput(fourTier())} h={h}>
        <Wired />
      </LabHarness>
    </NextIntlClientProvider>,
  );
  await expect.poll(() => h.check!.getState().status).toBe("done");
  return h as Handles;
}
const ctrlEnter = () => document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
const toasts = () => useToasts.getState().toasts.map((t) => t.message);

afterEach(() => useToasts.setState({ toasts: [] }));

describe("running from the shortcut", () => {
  it("Ctrl+Enter right after an edit is declined with 'still checking', not run on the old result", async () => {
    const h = await setup();
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "users"), edges: d.edges.filter((e) => e.from !== "users") })));
    act(() => {
      ctrlEnter();
    });
    await expect.poll(toasts).toContain("Still checking the design. Try again in a moment.");
    expect(h.design.getState().design.nodes.some((n) => n.id === "users")).toBe(false);
    expect(useToasts.getState().toasts).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 50));
    expect(h.check.getState().status).not.toBe("idle");
  });

  it("runs on Ctrl+Enter when the check is current, with no toast", async () => {
    const h = await setup();
    act(() => {
      ctrlEnter();
    });
    await expect.poll(() => h.runs.getState().currentId).toBe(1);
    expect(toasts()).toEqual([]);
  });

  it("says the problems block the run when a blocking issue exists", async () => {
    const h = await setup();
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "users"), edges: d.edges.filter((e) => e.from !== "users") })));
    await expect.poll(() => h.check.getState().status).toBe("done");
    act(() => {
      ctrlEnter();
    });
    await expect.poll(toasts).toContain("Fix the problems first");
  });

  it("does not repeat an earlier run's error on a later declined run", async () => {
    const h = await setup();
    // A previous failure is still recorded in the run store.
    act(() => h.runs.getState().fail("boom from an earlier run"));
    act(() => h.design.getState().apply((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== "users"), edges: d.edges.filter((e) => e.from !== "users") })));
    await expect.poll(() => h.check.getState().status).toBe("done");
    act(() => {
      ctrlEnter();
    });
    await expect.poll(toasts).toEqual(["Fix the problems first"]);
  });
});
