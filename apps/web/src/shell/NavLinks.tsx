"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/ui/cn";

const ITEMS = [
  { href: "/lab", key: "lab" },
  { href: "/learn", key: "learn" },
  { href: "/challenges", key: "challenges" },
  { href: "/leaderboard", key: "leaderboard" },
] as const;

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("primary")} className="flex shrink-0 items-center gap-0.5">
      {ITEMS.map((it) => {
        const current = pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              // §2.1: 14/500 text-2 tabs, 6×10 padding (6×8 at 1400 px or less); the current one on surface-2.
              "inline-flex items-center rounded-sm px-2.5 py-1.5 text-body font-medium whitespace-nowrap text-text-2 hover:bg-surface-2 hover:text-text max-[1400px]:px-2",
              current && "bg-surface-2 text-text",
            )}
          >
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
