// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { METAS } from "../../test/metas";
import { TooltipProvider } from "@/ui/Tooltip";
import { Palette } from "./Palette";

function setup(onAdd = vi.fn(), allowedKinds?: string[]) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <Palette metas={METAS} onAdd={onAdd} allowedKinds={allowedKinds} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  return onAdd;
}

describe("Palette", () => {
  it("adds a component on click", async () => {
    const onAdd = setup();
    await userEvent.click(screen.getByRole("button", { name: "Add Web server" }));
    expect(onAdd).toHaveBeenCalledWith("web-server");
  });

  it("filters as you type", async () => {
    setup();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search components" }), "postg");
    expect(screen.getAllByRole("button", { name: /^Add / }).map((b) => b.textContent)).toEqual(["PostgreSQL"]);
  });

  it("does not add a kind the challenge forbids", async () => {
    const onAdd = setup(vi.fn(), ["client"]);
    expect(screen.getByRole("button", { name: "Add Load balancer" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: "Add Load balancer" }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
