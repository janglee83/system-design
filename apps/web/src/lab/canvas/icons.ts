import { Box, Database, MonitorSmartphone, Server, Split, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  client: MonitorSmartphone,
  lb: Split,
  "web-server": Server,
  postgres: Database,
};
export const iconFor = (kind: string): LucideIcon => ICONS[kind] ?? Box;

export type Category = "entry" | "compute" | "data" | "cache" | "msg" | "storage" | "external";

/** The illustration category of each kind (design-system §1.1, category accents). */
const CATEGORY: Record<string, Category> = {
  client: "entry",
  mobile: "entry",
  dns: "entry",
  cdn: "entry",
  "api-gateway": "entry",
  lb: "entry",
  "rate-limiter": "entry",
  "web-server": "compute",
  worker: "compute",
  scheduler: "compute",
  postgres: "data",
  "read-replica": "data",
  "kv-store": "data",
  search: "data",
  redis: "cache",
  memcached: "cache",
  queue: "msg",
  rabbitmq: "msg",
  stream: "msg",
  "object-storage": "storage",
  "third-party": "external",
};
export const categoryOf = (kind: string): Category => CATEGORY[kind] ?? "external";

/** The category accent of a kind. It tints illustrations and tiles only. */
export const categoryColor = (kind: string): string => `var(--sd-cat-${categoryOf(kind)})`;
