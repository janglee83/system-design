import { setRequestLocale } from "next-intl/server";
import { contentIndex, loadCurriculum } from "@/content/load";
import { EngineProvider } from "@/engine/EngineProvider";
import { DesktopNotice } from "@/shell/DesktopNotice";
import { SearchButton } from "@/shell/SearchButton";
import { ShellClient } from "@/shell/ShellClient";
import { TopBar } from "@/shell/TopBar";
import { Announcer } from "@/ui/Announcer";
import { Toaster } from "@/ui/Toaster";
import { TooltipProvider } from "@/ui/Tooltip";

export default async function ShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const index = contentIndex(await loadCurriculum());
  return (
    <EngineProvider>
      <TooltipProvider>
        <ShellClient index={index}>
          <div className="flex h-dvh flex-col">
            <TopBar search={<SearchButton />} />
            <DesktopNotice />
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </ShellClient>
        <Toaster />
        <Announcer />
      </TooltipProvider>
    </EngineProvider>
  );
}
