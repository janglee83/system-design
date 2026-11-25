import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HelpMenu } from "./HelpMenu";
import { LanguageSwitch } from "./LanguageSwitch";
import { Mark } from "./Mark";
import { NavLinks } from "./NavLinks";
import { ThemeSwitch } from "./ThemeSwitch";
import { TopBarSlot } from "./top-bar-slot";

/**
 * The one 56 px bar (design-system §2.1): brand, nav, then the page's own controls ("main" slot),
 * the utilities, and the page's primary action ("end" slot; the Lab's Run button).
 */
export function TopBar({ search, helpItems }: { search?: React.ReactNode; helpItems?: React.ReactNode }) {
  const t = useTranslations("nav");
  return (
    <header data-testid="top-bar" className="relative flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
      <Link href="/lab" aria-label={t("home")} className="flex shrink-0 items-center gap-2 rounded-md px-1">
        <Mark />
        <span className="text-[15px] font-bold tracking-tight">{t("wordmark")}</span>
      </Link>
      <NavLinks />
      <TopBarSlot name="main" className="flex min-w-0 flex-1 items-center gap-2 empty:hidden" />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {search}
        <ThemeSwitch />
        <LanguageSwitch className="max-[1400px]:hidden" />
        <HelpMenu extraItems={helpItems} />
      </div>
      <TopBarSlot name="end" className="flex shrink-0 items-center empty:hidden" />
    </header>
  );
}
