// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ResizeHandle } from "./ResizeHandle";

function Harness({ start = 260 }: { start?: number }) {
  const [h, setH] = useState(start);
  return <ResizeHandle label="Resize results" value={h} min={160} max={400} onChange={setH} />;
}

describe("ResizeHandle", () => {
  it("is a horizontal separator with its value and limits", () => {
    render(<Harness />);
    const sep = screen.getByRole("separator", { name: "Resize results" });
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    expect(sep).toHaveAttribute("aria-valuenow", "260");
    expect(sep).toHaveAttribute("aria-valuemin", "160");
    expect(sep).toHaveAttribute("aria-valuemax", "400");
  });

  it("moves by 16 px with the arrow keys and stays within the limits", () => {
    render(<Harness start={384} />);
    const sep = screen.getByRole("separator");
    fireEvent.keyDown(sep, { key: "ArrowUp" });
    expect(sep).toHaveAttribute("aria-valuenow", "400");
    fireEvent.keyDown(sep, { key: "ArrowUp" });
    expect(sep).toHaveAttribute("aria-valuenow", "400");
    fireEvent.keyDown(sep, { key: "ArrowDown" });
    expect(sep).toHaveAttribute("aria-valuenow", "384");
    fireEvent.keyDown(sep, { key: "Home" });
    expect(sep).toHaveAttribute("aria-valuenow", "160");
  });

  it("drags: pulling up makes the panel taller", () => {
    render(<Harness />);
    const sep = screen.getByRole("separator");
    fireEvent.pointerDown(sep, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(sep, { clientY: 450, pointerId: 1 });
    fireEvent.pointerUp(sep, { clientY: 450, pointerId: 1 });
    expect(sep).toHaveAttribute("aria-valuenow", "310");
  });
});
