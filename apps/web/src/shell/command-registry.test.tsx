// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommandRegistryProvider, useRegisterCommands, useRegisteredCommands } from "./command-registry";
import type { SearchItem } from "./search";

const ITEMS: SearchItem[] = [{ id: "a", group: "command", title: { vi: "A", en: "A" }, run() {} }];
let renders = 0;

function Page() {
  useRegisterCommands("page", ITEMS);
  return null;
}
function Shown() {
  renders += 1;
  if (renders > 20) throw new Error("the registry keeps re-rendering");
  return <span data-testid="ids">{useRegisteredCommands().map((i) => i.id).join(",")}</span>;
}

describe("command registry", () => {
  it("registers a page's items once and then settles", async () => {
    renders = 0;
    render(
      <CommandRegistryProvider>
        <Page />
        <Shown />
      </CommandRegistryProvider>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("ids").textContent).toBe("a");
    const settled = renders;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(renders).toBe(settled);
    expect(renders).toBeLessThanOrEqual(3);
  });
});
