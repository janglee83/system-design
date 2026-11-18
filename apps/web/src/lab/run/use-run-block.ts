"use client";
import { useMemo } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { allIssues } from "../store/check-store";
import { useCheck, useDesign } from "../store/LabStores";
import { runBlockReason, type RunBlock } from "./run-gate";

/** Why Run is unavailable right now, or null when it can run. */
export function useRunBlock(): RunBlock | null {
  const engine = useEngineStore((s) => s.status);
  const nodes = useDesign((s) => s.design.nodes);
  const issues = useCheck((s) => s.issues);
  const runIssues = useCheck((s) => s.runIssues);
  const checked = useCheck((s) => s.status === "done");
  return useMemo(() => {
    const blocking = allIssues({ issues, runIssues }).filter((i) => i.blocking).length;
    return runBlockReason({ engine, kinds: nodes.map((n) => n.kind), blocking, checked });
  }, [engine, nodes, issues, runIssues, checked]);
}
