// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { NumberField } from "./NumberField";

const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>);

describe("NumberField", () => {
  it("clamps and rounds when committed", async () => {
    const onChange = vi.fn();
    wrap(<NumberField label="vCPUs" value={2} onChange={onChange} min={1} max={16} integer />);
    const input = screen.getByRole("spinbutton", { name: "vCPUs" });
    await userEvent.clear(input);
    await userEvent.type(input, "40{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(16);
    await userEvent.clear(input);
    await userEvent.type(input, "2.6");
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("steps with buttons and arrow keys", async () => {
    const onChange = vi.fn();
    wrap(<NumberField label="Memory" value={4} onChange={onChange} min={1} max={64} step={0.5} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase Memory" }));
    expect(onChange).toHaveBeenLastCalledWith(4.5);
    screen.getByRole("spinbutton", { name: "Memory" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(3.5);
  });

  it("commits undefined for an empty optional field and ignores junk", async () => {
    const onChange = vi.fn();
    wrap(<NumberField label="Service time" value={undefined} onChange={onChange} allowEmpty min={0} />);
    const input = screen.getByRole("spinbutton", { name: "Service time" });
    await userEvent.type(input, "abc{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
    await userEvent.type(input, "7{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(7);
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
