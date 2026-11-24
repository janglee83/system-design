// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { TooltipProvider } from "@/ui/Tooltip";
import { Scrubber } from "./Scrubber";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const MARKERS = [
  { atMs: 3000, level: "error" as const, text: "Web server 2 went down" },
  { atMs: 3000, level: "info" as const, text: "Traffic jumped" },
  { atMs: 6000, level: "warn" as const, text: "Queue filling" },
  { atMs: 8000, level: "info" as const, text: "Recovered" },
];

function setup(onSeek = vi.fn<(ms: number) => void>()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <Scrubber markers={MARKERS} durationMs={10_000} timeMs={3400} onSeek={onSeek} />
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
  return onSeek;
}

describe("Scrubber (design-system §7.2)", () => {
  it("is a slider with the time as text, and one focusable marker per 100 ms", () => {
    setup();
    const slider = screen.getByRole("slider", { name: "Playback time" });
    expect(slider).toHaveAttribute("aria-valuetext", "3.4 / 10.0 s");
    const markers = screen.getAllByRole("button", { name: /^\d+\.\d s:/ });
    expect(markers).toHaveLength(3); // the two at 3.0 s are one marker
    expect(markers[0]).toHaveAccessibleName("3.0 s: Web server 2 went down · Traffic jumped");
    expect(markers[0]).toHaveAttribute("data-level", "error"); // the most severe of the merged events
  });

  it("seeks from a marker and from the keyboard (End, Home, arrows by 0.1 s)", async () => {
    const onSeek = setup();
    await userEvent.click(screen.getByRole("button", { name: /^6\.0 s:/ }));
    expect(onSeek).toHaveBeenLastCalledWith(6000);
    const slider = screen.getByRole("slider", { name: "Playback time" });
    fireEvent.keyDown(slider, { key: "End" });
    expect(onSeek).toHaveBeenLastCalledWith(10_000);
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onSeek).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenLastCalledWith(3500);
  });
});
