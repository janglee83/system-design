// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { DesktopNotice } from "./DesktopNotice";

describe("DesktopNotice", () => {
  it("is in the first render and hidden by a media query on wide screens (no layout shift)", () => {
    // No matchMedia in this environment: the component must not need it.
    Reflect.deleteProperty(window, "matchMedia");
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DesktopNotice />
      </NextIntlClientProvider>,
    );
    const notice = screen.getByTestId("desktop-notice");
    expect(notice).toHaveTextContent(/at least 1280 pixels/);
    expect(notice.className).toContain("min-[1280px]:hidden");
  });
});
