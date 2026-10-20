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
