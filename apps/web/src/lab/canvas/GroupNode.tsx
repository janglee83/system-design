"use client";
import type { Node, NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/ui/cn";
import { renameGroup } from "../model/ops";
import { useDesignApi } from "../store/LabStores";
import type { GroupData } from "./rf-adapter";

/** A labelled frame around grouped nodes (R15). Double-click or F2 renames it. */
function GroupNodeView({ id, data, selected }: NodeProps<Node<GroupData>>) {
  const t = useTranslations("group");
  const api = useDesignApi();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.group.label);

  /** Set by Escape, so a blur while the input unmounts cannot commit the cancelled text. */
  const cancelled = useRef(false);
  const label = data.group.label;
  const startEditing = useCallback(() => {
    cancelled.current = false;
    setText(label);
    setEditing(true);
  }, [label]);
  const commit = () => {
    setEditing(false);
    if (cancelled.current) return;
    api.getState().apply((d) => renameGroup(d, id, text.trim()));
  };

  // F2 on the focused frame. React Flow focuses its own wrapper around this component, so the
  // key event never reaches our element; listen on the window while the frame is selected.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2") return;
      const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(".react-flow__node");
      if (focused?.dataset.id !== id) return;
      e.preventDefault();
      startEditing();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, id, startEditing]);

  return (
    <div
      data-testid={`group-${id}`}
      onDoubleClick={startEditing}
      className={cn(
        "relative h-full w-full rounded-lg border-[1.5px] border-dashed border-border-strong",
        selected && "outline-2 outline-offset-2 outline-accent",
      )}
      style={{ background: "color-mix(in srgb, var(--sd-surface-2) 55%, transparent)" }}
    >
      {editing ? (
        <input
          autoFocus
          aria-label={t("label")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              cancelled.current = true;
              setEditing(false);
            }
          }}
          className="nodrag absolute top-1 left-2 h-6 w-48 rounded-xs border border-border-strong bg-surface px-1.5 text-xs font-semibold"
        />
      ) : (
        <span title={t("rename")} className="absolute top-1.5 left-2.5 text-xs font-semibold text-text-2">
          {data.group.label || t("untitled")}
        </span>
      )}
    </div>
  );
}

export const GroupNode = memo(GroupNodeView);
