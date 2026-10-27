"use client";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useEngineStore } from "@/engine/EngineProvider";
import { useDesign, useUi } from "../store/LabStores";
import { useMetas } from "../use-metas";
import { DesignSettings } from "./DesignSettings";
import { EdgeInspector } from "./EdgeInspector";
import { NodeInspector } from "./NodeInspector";

const NO_KEYS: string[] = [];

/** Right-hand panel: the selected node or edge, else the design itself. */
export function Inspector() {
  const t = useTranslations("inspector");
  const selection = useDesign((s) => s.selection);
  const metas = useMetas();
  const overrideKeys = useEngineStore((s) => s.info?.capabilities.nodeOverrideKeys ?? NO_KEYS);
  const focusTick = useUi((s) => s.inspectorFocusTick);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusTick === 0) return;
    ref.current
      ?.querySelector<HTMLElement>("input:not(:disabled), button:not(:disabled), [role=combobox]:not([data-disabled])")
      ?.focus();
  }, [focusTick]);

  const { nodes, edges, groups } = selection;
  const count = nodes.length + edges.length + groups.length;
  let content: React.ReactNode;
  if (count === 0) content = <DesignSettings />;
  else if (nodes.length === 1 && count === 1) content = <NodeInspector nodeId={nodes[0]!} metas={metas} overrideKeys={overrideKeys} />;
  else if (edges.length === 1 && count === 1) content = <EdgeInspector edgeId={edges[0]!} metas={metas} />;
  else content = <p className="text-sm text-text-2">{t("multi", { count })}</p>;

  return (
    <div ref={ref} className="h-full overflow-y-auto p-3">
      {content}
    </div>
  );
}
