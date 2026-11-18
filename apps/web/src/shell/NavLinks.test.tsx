// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import { NavLinks } from "./NavLinks";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/challenges",
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("NavLinks", () => {
  it("lists the four sections and marks the current one", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <NavLinks />
      </NextIntlClientProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(links).toEqual(["Lab", "Learn", "Challenges", "Leaderboard"]);
    expect(screen.getByRole("link", { name: "Challenges" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Lab" })).not.toHaveAttribute("aria-current");
  });
});
