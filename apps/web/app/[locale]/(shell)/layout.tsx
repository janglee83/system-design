import { setRequestLocale } from "next-intl/server";
import { DesktopNotice } from "@/shell/DesktopNotice";
import { TopBar } from "@/shell/TopBar";
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
  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col">
        <TopBar />
        <DesktopNotice />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </TooltipProvider>
  );
}
