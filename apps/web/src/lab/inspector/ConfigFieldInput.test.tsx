// @vitest-environment jsdom
import "../../test/jsdom-radix";
import type { ConfigField } from "@sd/sim";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { meta } from "../../test/metas";
import { ConfigFieldInput } from "./ConfigFieldInput";

const field = (kind: string, key: string): ConfigField => meta(kind).fields.find((f) => f.key === key)!;
const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>);

describe("ConfigFieldInput", () => {
  it("renders a number field as a bounded stepper", () => {
    wrap(<ConfigFieldInput field={field("web-server", "cpu")} value={undefined} onChange={vi.fn()} />);
    const input = screen.getByRole("spinbutton", { name: "vCPUs" });
    expect(input).toHaveAttribute("aria-valuemin", "1");
    expect(input).toHaveAttribute("aria-valuemax", "16");
    expect(input).toHaveValue("1"); // the engine's default
  });

  it("renders a choice field as a select with translated options", async () => {
    const onChange = vi.fn();
    wrap(<ConfigFieldInput field={field("lb", "algorithm")} value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Balancing method" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Take turns", "Fewest open requests"]);
    await userEvent.click(screen.getByRole("option", { name: "Fewest open requests" }));
    expect(onChange).toHaveBeenCalledWith("least-conn");
  });

  it("renders a field with a boolean default as a switch (R17)", async () => {
    const onChange = vi.fn();
    const synthetic: ConfigField = { key: "cpu", kind: "choice", default: true, min: null, max: null, integer: false, options: [] };
    wrap(<ConfigFieldInput field={synthetic} value={undefined} onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "vCPUs" });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("disables the control", () => {
    wrap(<ConfigFieldInput field={field("lb", "algorithm")} value={undefined} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("combobox", { name: "Balancing method" })).toBeDisabled();
  });
});
