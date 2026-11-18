// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import curriculum from "../../../../../content/curriculum.json";
import { METAS } from "../../test/metas";
import { TooltipProvider } from "@/ui/Tooltip";
import { Palette } from "./Palette";

const PLANNED = curriculum.engine.planned.components;

function setup({ onAdd = vi.fn<(kind: string) => void>(), allowedKinds, running = false }: { onAdd?: (kind: string) => void; allowedKinds?: string[]; running?: boolean } = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <Palette metas={METAS} planned={PLANNED} onAdd={onAdd} allowedKinds={allowedKinds} running={running} prices={{ lb: 25 }} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  return onAdd;
}

beforeEach(() => window.localStorage.clear());

describe("Palette (4C)", () => {
  it("has a vertical tablist of seven categories, Entry open by default", () => {
    setup();
    const rail = screen.getByRole("tablist", { name: "Component types" });
    expect(rail).toHaveAttribute("aria-orientation", "vertical");
    expect(within(rail).getAllByRole("tab")).toHaveLength(7);
    expect(screen.getByRole("tab", { name: "Entry" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Entry points");
    expect(screen.getByRole("button", { name: "Add Load balancer" })).toHaveTextContent("$25");
  });

  it("adds a ready component on click, from its category", async () => {
    const onAdd = setup();
    await userEvent.click(screen.getByRole("tab", { name: "Compute" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Web server" }));
    expect(onAdd).toHaveBeenCalledWith("web-server");
  });

  it("shows coming-soon kinds disabled; they cannot be added or dragged", async () => {
    const onAdd = setup();
    await userEvent.click(screen.getByRole("tab", { name: "Cache" }));
    const redis = screen.getByRole("button", { name: "Add Redis" });
    expect(redis).toHaveAttribute("aria-disabled", "true");
    expect(redis).toHaveAttribute("draggable", "false");
    expect(redis).toHaveTextContent("Coming soon");
    expect(screen.getByRole("button", { name: "Add Memcached" })).toHaveTextContent("Coming soon");
    await userEvent.click(redis);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("searches every category without accents", async () => {
    setup();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search components" }), "takes reads off");
    expect(screen.getAllByRole("button", { name: /^Add / }).map((b) => b.getAttribute("aria-label"))).toEqual(["Add Redis"]);
  });

  it("closes the drawer when the open category is clicked again, and remembers it", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Entry" }));
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(window.localStorage.getItem("sd-palette-open")).toBe("");
  });

  it("opens the kind card on focus, with the coming-soon note", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "Entry" })); // close
    await userEvent.click(screen.getByRole("tab", { name: "Entry" })); // open
    screen.getByRole("button", { name: "Add CDN" }).focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Can’t be placed on the canvas yet");
  });

  it("does not add a kind the challenge forbids, and marks it locked", async () => {
    const onAdd = setup({ allowedKinds: ["client"] });
    const lb = screen.getByRole("button", { name: "Add Load balancer" });
    expect(lb).toHaveAttribute("aria-disabled", "true");
    expect(lb).toHaveTextContent("Locked");
    await userEvent.click(lb);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes the drawer during a run and says why adding waits", () => {
    setup({ running: true });
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByRole("tab", { name: "Entry" })).toHaveAttribute("aria-disabled", "true");
  });
});
