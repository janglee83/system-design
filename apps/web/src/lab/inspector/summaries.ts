import type { ComponentMeta, Workload } from "@sd/sim";
import { configLine } from "../canvas/node-lines";
import { formatNumber } from "../format";
import type { Translate } from "../labels";
import type { LabNode } from "../model/design";

/** Closed-section summaries and the cost breakdown (design-system §4.1–4.2). Pure, translated. */

export function configSummary(
  node: Pick<LabNode, "kind" | "config" | "replicas">,
  meta: ComponentMeta | null,
  baseRps: number,
  t: Translate,
  locale: string,
): string {
  const line = configLine(node, meta, { baseRps }, t, locale);
  return node.replicas > 1 ? `${line} · ${t("lab.node.replicas", { count: node.replicas })}` : line;
}

export function advancedSummary(node: Pick<LabNode, "config">, overrideKeys: readonly string[], t: Translate): string {
  const own = overrideKeys.filter((k) => typeof node.config[k] === "number").length;
  return own === 0 ? t("inspector.summary.world") : t("inspector.summary.own", { count: own });
}

export function costBreakdown(cost: number | null | undefined, replicas: number, t: Translate, locale: string): string {
  if (typeof cost !== "number") return "";
  const each = cost / Math.max(1, replicas);
  const decimals = Number.isInteger(each) ? 0 : 1;
  return t("inspector.summary.breakdown", { count: replicas, each: formatNumber(each, locale, decimals) });
}

export function connectionsSummary(incoming: number, outgoing: number, t: Translate): string {
  return incoming + outgoing === 0 ? t("inspector.summary.noConnections") : t("inspector.summary.connections", { incoming, outgoing });
}

export function workloadSummary(w: Pick<Workload, "baseRps" | "writeRatio">, t: Translate, locale: string): string {
  return t("inspector.summary.workload", { rps: formatNumber(w.baseRps, locale, 0), writes: Math.round(w.writeRatio * 100) });
}

export function runSummary(durationMs: number, seed: number, t: Translate): string {
  return t("inspector.summary.run", { seconds: durationMs / 1000, seed });
}

export function faultsSummary(count: number, t: Translate): string {
  return t("inspector.summary.faults", { count });
}
