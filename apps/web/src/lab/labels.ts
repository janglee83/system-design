import type { ComponentMeta } from "@sd/sim";
import type { LabNode } from "./model/design";
import { nodeNumber } from "./model/ids";

// Any next-intl translator. Method syntax keeps `key` bivariant, so a translator typed with
// the catalog's exact keys (createTranslator in tests) fits as well as useTranslations().
type T = { translate(key: string, values?: Record<string, string | number>): string }["translate"];

/** R12: the user's label, else the translated component name plus the node's number. */
export function displayLabel(node: Pick<LabNode, "id" | "kind" | "label">, meta: ComponentMeta | null, t: T): string {
  if (node.label.trim() !== "") return node.label;
  if (!meta) return node.id;
  const name = t(meta.labelKey);
  const n = nodeNumber(node.id, node.kind);
  return n === null ? `${name} (${node.id})` : `${name} ${n}`;
}
