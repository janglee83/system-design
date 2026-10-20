import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRoot } from "../test/paths";

const eslint = new ESLint({ cwd: appRoot });

async function literalStrings(code: string, file = "src/lab/Fixture.tsx"): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: path.join(appRoot, file) });
  return result!.messages.filter((m) => m.ruleId === "i18next/no-literal-string").length;
}

describe("no hard-coded user-facing strings", () => {
  it("flags JSX text and user-facing attributes", async () => {
    const code = `export function X() {
      return <button aria-label="Run the design" title="Start a run">Run now</button>;
    }`;
    expect(await literalStrings(code)).toBe(3);
  });

  it("allows translated text and technical attributes", async () => {
    const code = `import { useTranslations } from "next-intl";
    export function X() {
      const t = useTranslations("lab");
      return <div className="flex gap-2" data-testid="run" id="run" role="group" aria-label={t("title")}>{t("title")}</div>;
    }`;
    expect(await literalStrings(code)).toBe(0);
  });

  it("allows punctuation and symbols in JSX", async () => {
    expect(await literalStrings(`export const X = () => <span>· / — ×</span>;`)).toBe(0);
  });

  it("does not apply to tests", async () => {
    expect(await literalStrings(`export const X = () => <p>Hello there</p>;`, "src/lab/Fixture.test.tsx")).toBe(0);
  });
}, 60_000);

describe("the Node build of the engine stays out of runtime code", () => {
  const nodeImports = async (file: string) => {
    const [result] = await eslint.lintText(`import { sim } from "@sd/sim/node";\nexport const v = sim.engineVersion();\n`, {
      filePath: path.join(appRoot, file),
    });
    return result!.messages.filter((m) => m.ruleId === "no-restricted-imports").length;
  };

  it("refuses @sd/sim/node in app and src code", async () => {
    expect(await nodeImports("src/lab/model/x.ts")).toBe(1);
    expect(await nodeImports("app/[locale]/x.tsx")).toBe(1);
  });

  it("allows it in tests and test support files", async () => {
    expect(await nodeImports("src/lab/model/x.test.ts")).toBe(0);
    expect(await nodeImports("src/test/x.ts")).toBe(0);
  });
}, 60_000);
