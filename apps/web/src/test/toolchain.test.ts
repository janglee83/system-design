import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRoot } from "./paths";

const pkg = JSON.parse(fs.readFileSync(path.join(appRoot, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("toolchain", () => {
  it("pins every dependency to an exact version", () => {
    const loose = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(
      ([, v]) => !v.startsWith("workspace:") && !/^\d+\.\d+\.\d+$/.test(v),
    );
    expect(loose).toEqual([]);
  });
});

describe("Playwright in the dev image", () => {
  it("installs the same browser build as @playwright/test", () => {
    const dockerfile = fs.readFileSync(path.join(appRoot, "../../Dockerfile"), "utf8");
    const match = dockerfile.match(/playwright@(\d+\.\d+\.\d+) install/);
    expect(match?.[1]).toBe(pkg.devDependencies["@playwright/test"]);
  });
});

const WORKFLOWS = ["web.yml", "engine.yml", "content.yml"] as const;
const workflow = (name: string) => fs.readFileSync(path.join(appRoot, "../../.github/workflows", name), "utf8");

describe("CI workflows", () => {
  it.each(WORKFLOWS)("%s gives its token read-only repository access", (name) => {
    expect(workflow(name)).toMatch(/^permissions:\n {2}contents: read\n/m);
  });
});
