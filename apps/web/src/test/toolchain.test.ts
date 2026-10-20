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

describe("web workflow triggers", () => {
  it("runs when the toolchain or the dev container changes", () => {
    const paths = [...workflow("web.yml").matchAll(/^ {6}- "([^"]+)"$/gm)].map((m) => m[1]);
    for (const p of ["Cargo.toml", "Cargo.lock", "rust-toolchain.toml", "dev", ".dockerignore", "Dockerfile", "compose.yaml"]) {
      expect(paths, p).toContain(p);
    }
  });
});

const compose = () => fs.readFileSync(path.join(appRoot, "../../compose.yaml"), "utf8");

describe("compose", () => {
  it("publishes the web dev server on localhost only", () => {
    const ports = [...compose().matchAll(/^ {6}- "([^"]+)"$/gm)].map((m) => m[1]);
    expect(ports).toEqual(["127.0.0.1:3000:3000"]);
  });
});

describe("workspace toolchain", () => {
  it("@sd/sim uses the same vitest and typescript as the app", () => {
    const sim = JSON.parse(fs.readFileSync(path.join(appRoot, "../../packages/sim/package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    for (const name of ["vitest", "typescript"]) {
      expect(sim.devDependencies[name], name).toBe(pkg.devDependencies[name]);
    }
  });
});
