// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TEXT_MAX, TextField } from "./TextField";

describe("TextField", () => {
  it("trims what it commits and does not commit whitespace-only changes", async () => {
    const onCommit = vi.fn();
    render(<TextField label="Name" value="api" onCommit={onCommit} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    await userEvent.type(input, "   {Enter}");
    expect(onCommit).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, "  Edge proxy  {Enter}");
    expect(onCommit).toHaveBeenLastCalledWith("Edge proxy");
  });

  it("caps the length", async () => {
    render(<TextField label="Name" value="" onCommit={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("maxLength", String(TEXT_MAX));
    expect(TEXT_MAX).toBe(80);
  });
});
