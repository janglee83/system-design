"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { IconButton } from "@/ui/IconButton";
import { useMediaQuery } from "@/ui/use-media-query";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AboutDialog } from "./AboutDialog";
import { useOnboarding } from "./onboarding-store";
import { LanguageItems } from "./LanguageSwitch";
import { MENU_CONTENT_CLASS, MENU_ITEM_CLASS, MENU_LABEL_CLASS } from "./menu-styles";

/** The width at or below which the language button folds into this menu (design-system §2.1). */
export const NARROW_TOP_BAR = "(max-width: 1400px)";

/** The help menu in the top bar. `extraItems` (DropdownMenu items) come first; Task 33 adds the shortcut sheet. */
export function HelpMenu({ extraItems }: { extraItems?: React.ReactNode }) {
  const t = useTranslations();
  const [aboutOpen, setAboutOpen] = useState(false);
  const narrow = useMediaQuery(NARROW_TOP_BAR);
  const pathname = usePathname();
  const router = useRouter();
  return (
    <>
      <DM.Root modal={false}>
        <DM.Trigger asChild>
          <IconButton label={t("help.label")}>
            <CircleHelp size={16} aria-hidden />
          </IconButton>
        </DM.Trigger>
        <DM.Portal>
          <DM.Content align="end" sideOffset={6} className={MENU_CONTENT_CLASS}>
            {extraItems}
            {extraItems ? <DM.Separator className="my-1 h-px bg-border" /> : null}
            <DM.Item
              className={MENU_ITEM_CLASS}
              onSelect={() => {
                useOnboarding.getState().reopen();
                if (pathname !== "/lab") router.push("/lab");
              }}
            >
              {t("onboarding.help")}
            </DM.Item>
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => setAboutOpen(true)}>
              {t("help.about")}
            </DM.Item>
            {narrow ? (
              <>
                <DM.Separator className="my-1 h-px bg-border" />
                <DM.Label className={MENU_LABEL_CLASS}>{t("language.label")}</DM.Label>
                <LanguageItems />
              </>
            ) : null}
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
