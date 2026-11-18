import type { WasmBinding } from "./binding";
import { rethrow } from "./errors";
import { SimRun } from "./run";
import type { Calibration, Capabilities, ComponentMeta, FixtureReport, Goal, Graph, GraphLimits, SimInput, ValidationIssue, Verdict } from "./types";

export interface Sim {
  simulate(input: SimInput): SimRun;
  simulateJson(json: string): string;
  validateGraph(graph: Graph, limits?: GraphLimits): ValidationIssue[];
  grade(run: SimRun, goals: Goal[]): Verdict;
  listComponents(): ComponentMeta[];
  defaultCalibration(): Calibration;
  capabilities(): Capabilities;
  checkFixture(json: string): FixtureReport;
  engineVersion(): string;
}

export function createSim(binding: WasmBinding): Sim {
  const call = <T>(fn: () => T): T => {
    try { return fn(); } catch (e) { return rethrow(e); }
  };
  return {
    simulate: (input) => new SimRun(call(() => binding.simulate(input))),
    simulateJson: (json) => call(() => binding.simulateJson(json)),
    validateGraph: (graph, limits) => call(() => binding.validateGraph(graph, limits ?? null)) as ValidationIssue[],
    grade: (run, goals) => call(() => binding.grade(run.raw(), goals)) as Verdict,
    listComponents: () => call(() => binding.listComponents()) as ComponentMeta[],
    defaultCalibration: () => call(() => binding.defaultCalibration()) as Calibration,
    capabilities: () => call(() => binding.capabilities()) as Capabilities,
    checkFixture: (json) => call(() => binding.checkFixture(json)) as FixtureReport,
    engineVersion: () => binding.engineVersion(),
  };
}
