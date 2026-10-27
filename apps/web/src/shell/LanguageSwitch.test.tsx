// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { LanguageSwitch } from "./LanguageSwitch";

const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/challenges",
  useRouter: () => ({ replace }),
}));

describe("LanguageSwitch", () => {
  it("keeps the query and the hash, and remembers the choice with the routing cookie settings", async () => {
    window.history.replaceState(null, "", "/en/challenges?mode=a#top");
    const cookie = vi.spyOn(document, "cookie", "set");
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LanguageSwitch />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole("radio", { name: "VI" }));
    expect(replace).toHaveBeenCalledWith("/challenges?mode=a#top", { locale: "vi" });
    expect(cookie).toHaveBeenCalledWith(`NEXT_LOCALE=vi; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`);
  });
});
