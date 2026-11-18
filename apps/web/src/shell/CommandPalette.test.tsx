// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { CommandPalette } from "./CommandPalette";
import type { SearchItem } from "./search";

Element.prototype.scrollIntoView ??= () => {};
class NoResize {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoResize as unknown as typeof ResizeObserver;

const items = (runPg = vi.fn()): SearchItem[] => [
  { id: "cmd-run", group: "command", title: { vi: "Chạy thiết kế", en: "Run the design" }, run: vi.fn() },
  { id: "cmp-web", group: "component", title: { vi: "Máy chủ web", en: "Web server" }, keywords: ["web-server"], run: vi.fn() },
  { id: "cmp-pg", group: "component", title: { vi: "PostgreSQL", en: "PostgreSQL" }, keywords: ["postgres", "pg"], run: runPg },
];

function setup(onOpenChange = vi.fn(), runPg = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CommandPalette open onOpenChange={onOpenChange} items={items(runPg)} locale="en" />
    </NextIntlClientProvider>,
  );
  return { onOpenChange, runPg };
}

describe("CommandPalette", () => {
  it("opens with the search field and its placeholder", () => {
    setup();
    expect(screen.getByRole("combobox", { name: "Search" })).toHaveAttribute("placeholder", "Search commands, components, lessons, challenges…");
  });

  it("finds a component by its short name, runs it with Enter and closes", async () => {
    const { onOpenChange, runPg } = setup();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "pg");
    expect(screen.getByRole("group", { name: "Components" })).toHaveTextContent("PostgreSQL");
    await userEvent.keyboard("{Enter}");
    expect(runPg).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("says when nothing matches", async () => {
    setup();
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "zzzzqqq");
    expect(screen.getByText("Nothing found for “zzzzqqq”.")).toBeInTheDocument();
  });
});
