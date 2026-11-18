import type { SimInput } from "@sd/sim";

export function runExportFile(a: { engineVersion: string; input: SimInput; resultJson: string }): string {
  const doc = { kind: "sd-lab-run", formatVersion: 1, engineVersion: a.engineVersion, input: a.input, result: JSON.parse(a.resultJson) as unknown };
  return `${JSON.stringify(doc, null, 2)}\n`;
}
