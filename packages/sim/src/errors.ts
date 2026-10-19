import type { ValidationIssue } from "./types";

export class SimValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(`invalid graph: ${issues.map((i) => i.code).join(", ")}`);
    this.name = "SimValidationError";
  }
}

export class SimInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimInputError";
  }
}

/** Converts what the wasm side throws into typed errors. */
export function rethrow(e: unknown): never {
  if (e && typeof e === "object" && "kind" in e) {
    const err = e as { kind: string; issues?: ValidationIssue[]; message?: string };
    if (err.kind === "validation") throw new SimValidationError(err.issues ?? []);
    if (err.kind === "input") throw new SimInputError(err.message ?? "invalid input");
  }
  throw e;
}
