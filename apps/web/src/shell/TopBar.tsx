import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HelpMenu } from "./HelpMenu";
import { LanguageSwitch } from "./LanguageSwitch";
import { Mark } from "./Mark";
import { NavLinks } from "./NavLinks";
import { ThemeSwitch } from "./ThemeSwitch";

export function TopBar({ search, helpItems }: { search?: React.ReactNode; helpItems?: React.ReactNode }) {
  const t = useTranslations("nav");
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-3">
      <Link href="/lab" aria-label={t("home")} className="flex items-center gap-2 rounded-md px-1">
        <Mark />
        <span className="text-[15px] font-bold tracking-tight">{t("wordmark")}</span>
      </Link>
      <NavLinks />
      <div className="ml-auto flex items-center gap-2">
        {search}
        <LanguageSwitch />
        <ThemeSwitch />
        <HelpMenu extraItems={helpItems} />
      </div>
    </header>
  );
}
