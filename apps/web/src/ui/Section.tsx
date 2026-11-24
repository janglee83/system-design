"use client";
import * as A from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "sd-inspector-sections";

function readOpen(id: string): boolean | undefined {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    return typeof all[id] === "boolean" ? all[id] : undefined;
  } catch {
    return undefined;
  }
}
function writeOpen(id: string, open: boolean) {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: open }));
  } catch {
    // storage blocked: remembered for this page only
  }
}

/**
 * A collapsible inspector section (design-system §4.1): a 13/600 header with a chevron, a one-line
 * summary while closed, and the open state remembered in this browser under `id` (per kind).
 */
export function Section({
  title,
  id,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  id?: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const stored = id ? readOpen(id) : undefined;
    setOpen(stored ?? defaultOpen);
  }, [id, defaultOpen]);
  return (
    <A.Root
      type="single"
      collapsible
      value={open ? "s" : ""}
      onValueChange={(v) => {
        setOpen(v === "s");
        if (id) writeOpen(id, v === "s");
      }}
      className="border-b border-border"
    >
      <A.Item value="s">
        <A.Header>
          <A.Trigger className="group flex w-full items-center gap-1.5 px-4 py-3 text-left text-[13px] leading-[18px] font-semibold">
            <ChevronDown size={14} aria-hidden className="shrink-0 -rotate-90 text-text-2 transition-transform duration-(--sd-t-fast) group-data-[state=open]:rotate-0" />
            <span className="shrink-0">{title}</span>
            {summary && !open ? (
              <span className="ml-auto max-w-[190px] truncate text-caption font-normal text-text-3">{summary}</span>
            ) : null}
          </A.Trigger>
        </A.Header>
        <A.Content data-section-body className="flex flex-col gap-3 px-4 pb-4">
          {children}
        </A.Content>
      </A.Item>
    </A.Root>
  );
}
