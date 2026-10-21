import { Box, Database, MonitorSmartphone, Server, Split, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  client: MonitorSmartphone,
  lb: Split,
  "web-server": Server,
  postgres: Database,
};
export const iconFor = (kind: string): LucideIcon => ICONS[kind] ?? Box;

/** CSS colour variable per component category (Visual design: icon tiles). */
export const categoryColor = (category: string | undefined): string =>
  category === "compute" || category === "data" || category === "general" ? `var(--sd-cat-${category})` : "var(--sd-cat-general)";
