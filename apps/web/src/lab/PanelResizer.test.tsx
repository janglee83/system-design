// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INSPECTOR_WIDTH, PanelResizer, usePanelWidth } from "./PanelResizer";

function Harness() {
  const [w, setW] = usePanelWidth("inspector", INSPECTOR_WIDTH);
  return <PanelResizer label="Inspector width" value={w} {...INSPECTOR_WIDTH} onChange={setW} />;
}

describe("PanelResizer (Task 35a)", () => {
  it("is a vertical separator that moves 16 px per arrow key within its limits", () => {
    render(<Harness />);
    const s = screen.getByRole("separator", { name: "Inspector width" });
    expect(s).toHaveAttribute("aria-orientation", "vertical");
    expect(s).toHaveAttribute("aria-valuenow", "368");
    fireEvent.keyDown(s, { key: "ArrowLeft" }); // the inspector is on the right: left makes it wider
    expect(s).toHaveAttribute("aria-valuenow", "384");
    fireEvent.keyDown(s, { key: "ArrowRight" });
    fireEvent.keyDown(s, { key: "ArrowRight" });
    expect(s).toHaveAttribute("aria-valuenow", "352");
    fireEvent.keyDown(s, { key: "End" });
    expect(s).toHaveAttribute("aria-valuenow", "480");
    fireEvent.keyDown(s, { key: "ArrowLeft" });
    expect(s).toHaveAttribute("aria-valuenow", "480");
    fireEvent.keyDown(s, { key: "Home" });
    expect(s).toHaveAttribute("aria-valuenow", "320");
  });

  it("keeps the width in this browser across a remount", () => {
    const first = render(<Harness />);
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
    first.unmount();
    render(<Harness />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "384");
  });
});
