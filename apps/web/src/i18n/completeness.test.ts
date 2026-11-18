import { sim } from "@sd/sim/node";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { requiredKeys } from "./engine-codes";
import { flatten } from "./flatten";

const required = requiredKeys(sim.listComponents(), sim.capabilities(), sim.defaultCalibration());

describe.each([["vi", flatten(vi)], ["en", flatten(en)]] as const)("%s catalog", (_lang, flat) => {
  it("has a message for every code, kind, field and metric the engine can produce", () => {
    expect(required.filter((k) => !(k in flat))).toEqual([]);
  });
});

it("requires the expected categories", () => {
  expect(required).toContain("engine.event.node.overloaded");
  expect(required).toContain("engine.validation.edge.not-accepted");
  expect(required).toContain("fault.kv-node-down");
  expect(required).toContain("component.web-server");
  expect(required).toContain("componentDescription.postgres");
  expect(required).toContain("configOption.algorithm.least-conn");
  expect(required).toContain("override.serviceMs");
  expect(required).toContain("calibration.pgFailoverMs");
  expect(required).toContain("metric.staleReads");
  expect(required).toContain("timelineField.inFlight");
});
