import type { ComponentMeta, ConfigValue } from "@sd/sim";
import { formatNumber } from "../format";
import type { Translate } from "../labels";
import type { LabNode } from "../model/design";

/** A config value, or the engine's default when the node leaves it unset. */
function value(node: Pick<LabNode, "config">, meta: ComponentMeta | null, key: string): ConfigValue | undefined {
  return node.config[key] ?? meta?.fields.find((f) => f.key === key)?.default;
}

/** Body line 2 while editing: what the node is set to ("1 vCPU · 2 GB"), design-system §5. */
export function configLine(
  node: Pick<LabNode, "kind" | "config">,
  meta: ComponentMeta | null,
  world: { baseRps: number },
  t: Translate,
  locale: string,
): string {
  const num = (key: string) => Number(value(node, meta, key) ?? 0);
  switch (node.kind) {
    case "client":
      return t("lab.node.line.client", { rps: formatNumber(world.baseRps, locale, 0) });
    case "web-server":
      return t("lab.node.line.webServer", { cpu: num("cpu"), memoryGb: num("memoryGb") });
    case "postgres":
      return t("lab.node.line.postgres", { replicas: num("readReplicas") });
    case "lb":
      return t(`configOption.algorithm.${String(value(node, meta, "algorithm"))}`);
    default:
      return meta ? t(meta.labelKey) : node.kind;
  }
}

/** Body line 3 while editing: the monthly cost, "free", or "no price yet". */
export function costLine(cost: number | null | undefined, t: Translate, locale: string): string {
  if (typeof cost !== "number") return t("lab.node.noPrice");
  if (Math.round(cost) === 0) return t("lab.node.free");
  return t("lab.node.cost", { cost: formatNumber(Math.round(cost), locale, 0) });
}
