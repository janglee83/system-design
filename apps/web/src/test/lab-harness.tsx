// Test harness: a Lab store provider over an engine backed by the in-process FakeWorker.
import { useEffect } from "react";
import { EngineClient, type WorkerLike } from "@/engine/client";
import { EngineProvider, useEngineStart, useEngineStore } from "@/engine/EngineProvider";
import type { EngineState } from "@/engine/engine-store";
import type { Design } from "@/lab/model/design";
import type { createCheckStore } from "@/lab/store/check-store";
import type { DesignStore } from "@/lab/store/design-store";
import { LabStoresProvider, useCanRun, useCheckApi, useDesignApi, useRunsApi, useUiApi } from "@/lab/store/LabStores";
import type { createRunStore } from "@/lab/store/run-store";
import type { UiStore } from "@/lab/store/ui-store";
import { FakeWorker } from "./engine-fixtures";

export interface Handles {
  design: DesignStore;
  check: ReturnType<typeof createCheckStore>;
  ui: UiStore;
  runs: ReturnType<typeof createRunStore>;
  engine: () => EngineState;
  canRun: () => boolean;
}

/** Fills `h` with the live store APIs once mounted. */
export function LabHarness({
  initial,
  h,
  worker = () => new FakeWorker(),
  children,
}: {
  initial?: Design;
  h: Partial<Handles>;
  worker?: () => WorkerLike;
  children?: React.ReactNode;
}) {
  return (
    <EngineProvider makeClient={() => new EngineClient(worker)}>
      <Start />
      <LabStoresProvider initial={initial}>
        <Grab h={h} />
        {children}
      </LabStoresProvider>
    </EngineProvider>
  );
}

function Start() {
  useEngineStart();
  return null;
}

let canRunNow = false;
function Grab({ h }: { h: Partial<Handles> }) {
  h.design = useDesignApi();
  h.check = useCheckApi();
  h.ui = useUiApi();
  h.runs = useRunsApi();
  const state = useEngineStore((s) => s);
  canRunNow = useCanRun();
  useEffect(() => {
    h.engine = () => state;
  });
  h.canRun = () => canRunNow;
  return null;
}
