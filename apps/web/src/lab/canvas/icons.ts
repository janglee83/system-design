import { Box, Database, MonitorSmartphone, Server, Split, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  client: MonitorSmartphone,
  lb: Split,
  "web-server": Server,
  postgres: Database,
};
export const iconFor = (kind: string): LucideIcon => ICONS[kind] ?? Box;

export { categoryColor, categoryOf, type Category } from "./kinds";
