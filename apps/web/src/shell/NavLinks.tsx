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
    <nav aria-label={t("primary")} className="flex h-full items-stretch gap-1">
      {ITEMS.map((it) => {
        const current = pathname === it.href || pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative inline-flex items-center px-3 text-sm font-medium text-text-2 hover:text-text",
              current && "text-text after:absolute after:inset-x-3 after:bottom-[7px] after:h-0.5 after:rounded-full after:bg-accent",
            )}
          >
            {t(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}
