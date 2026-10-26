import type { ComponentMeta, ValidationIssue } from "@sd/sim";
import { displayLabel, type Translate } from "./labels";
import type { LabEdge, LabNode } from "./model/design";

/** The names a message needs: node ids, kinds and labels, and edge ends (live design or a run's snapshot). */
export interface NamedGraph {
  nodes: readonly Pick<LabNode, "id" | "kind" | "label">[];
  edges: readonly Pick<LabEdge, "id" | "from" | "to" | "kind">[];
}

// Bivariant (method syntax) so translators typed with the catalog keys fit too; see labels.ts.
type T = Translate & { has?(key: string): boolean };

export interface IssueContext {
  design: NamedGraph;
  metas: ReadonlyMap<string, ComponentMeta>;
  t: T;
}

function fieldLabel(field: string | null, t: T): string {
  if (!field) return "";
  for (const key of [`configField.${field}`, `override.${field}`, `calibration.${field}`, `workload.field.${field}`, `problems.field.${field}`]) {
    if (t.has?.(key)) return t(key);
  }
  return field;
}

/** The translated sentence for an engine validation issue (spec §5.1). */
export function issueText(issue: ValidationIssue, { design, metas, t }: IssueContext): string {
  const label = (id: string | null | undefined) => {
    const n = id ? design.nodes.find((x) => x.id === id) : undefined;
    return n ? displayLabel(n, metas.get(n.kind) ?? null, t) : (id ?? "");
  };
  const edge = issue.edgeId ? design.edges.find((e) => e.id === issue.edgeId) : undefined;
  const key = `engine.validation.${issue.code}`;
  if (t.has && !t.has(key)) return issue.code;
  return t(key, {
    node: label(issue.nodeId),
    source: label(edge?.from),
    target: label(edge?.to),
    edge: edge ? `${label(edge.from)} → ${label(edge.to)}` : "",
    kind: edge ? t(`edgeKind.${edge.kind}`) : "",
    field: fieldLabel(issue.field, t),
  });
}
