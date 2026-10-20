"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { IconButton } from "@/ui/IconButton";
import { AboutDialog } from "./AboutDialog";

export const MENU_ITEM_CLASS =
  "flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-sm text-text outline-none select-none data-[highlighted]:bg-surface-2";

/** The help menu in the top bar. `extraItems` (DropdownMenu items) come first; Task 33 adds the shortcut sheet and tour. */
export function HelpMenu({ extraItems }: { extraItems?: React.ReactNode }) {
  const t = useTranslations("help");
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <DM.Root modal={false}>
        <DM.Trigger asChild>
          <IconButton label={t("label")}>
            <CircleHelp size={18} aria-hidden />
          </IconButton>
        </DM.Trigger>
        <DM.Portal>
          <DM.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-48 rounded-md border border-border bg-surface p-1 shadow-2"
          >
            {extraItems}
            {extraItems ? <DM.Separator className="my-1 h-px bg-border" /> : null}
            <DM.Item className={MENU_ITEM_CLASS} onSelect={() => setAboutOpen(true)}>
              {t("about")}
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
