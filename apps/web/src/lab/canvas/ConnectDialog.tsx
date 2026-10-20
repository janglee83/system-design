"use client";
import type { ComponentMeta } from "@sd/sim";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { cn } from "@/ui/cn";
import { Dialog } from "@/ui/Dialog";
import { connectNodes } from "../commands";
import { displayLabel } from "../labels";
import type { LabNode } from "../model/design";
import { useDesign, useDesignApi, useUi, useUiApi } from "../store/LabStores";

/** Keyboard way to connect: pick the target for the single selected node (R13). */
export function ConnectDialog({ metas }: { metas: ReadonlyMap<string, ComponentMeta> }) {
  const t = useTranslations();
  const open = useUi((s) => s.connectOpen);
  const uiApi = useUiApi();
  const api = useDesignApi();
  const sourceId = useDesign((s) => (s.selection.nodes.length === 1 ? s.selection.nodes[0]! : null));
  const nodes = useDesign((s) => s.design.nodes);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();

  useEffect(() => {
    setActive(0);
    setError(null);
  }, [open, sourceId]);

  const source = nodes.find((n) => n.id === sourceId);
  const options = nodes.filter((n) => n.id !== sourceId);
  const label = (n: LabNode) => displayLabel(n, metas.get(n.kind) ?? null, t);
  const close = useCallback(() => uiApi.getState().set({ connectOpen: false }), [uiApi]);

  // The source was deleted or deselected (undo, another tab of the inspector): nothing to connect.
  useEffect(() => {
    if (open && !source) close();
  }, [open, source, close]);

  // Arrow keys move through a list that can be longer than the dialog.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const pick = (i: number) => {
    const target = options[i];
    if (!source || !target) return;
    const r = connectNodes(api, metas, source.id, target.id);
    if (r.ok) close();
    else setError(t(`connect.refused.${r.reason}`, { source: label(source), target: label(target) }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (options.length === 0) return;
    if (e.key === "ArrowDown") setActive((a) => (a + 1) % options.length);
    else if (e.key === "ArrowUp") setActive((a) => (a - 1 + options.length) % options.length);
    else if (e.key === "Enter") pick(active);
    else return;
    e.preventDefault();
  };

  const sourceLabel = source ? label(source) : "";
  return (
    <Dialog
      open={open && source !== undefined}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      title={t("connect.title", { source: sourceLabel })}
      description={t("connect.description", { source: sourceLabel })}
    >
      {options.length === 0 ? (
        <p className="text-sm text-text-2">{t("connect.none")}</p>
      ) : (
        <ul
          role="listbox"
          tabIndex={0}
          aria-label={t("connect.title", { source: sourceLabel })}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onKeyDown}
          className="max-h-72 overflow-y-auto rounded-md border border-border p-1"
        >
          {options.map((n, i) => (
            <li
              key={n.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex h-8 cursor-default items-center justify-between gap-3 rounded-sm px-2 text-sm",
                i === active && "bg-accent-soft",
              )}
            >
              <span className="truncate">{label(n)}</span>
              <span className="truncate text-xs text-text-3">{metas.get(n.kind) ? t(metas.get(n.kind)!.labelKey) : n.kind}</span>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-over">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
