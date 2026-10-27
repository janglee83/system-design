"use client";
import * as T from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <T.Provider delayDuration={400} skipDelayDuration={200}>{children}</T.Provider>;
}

export function Tooltip({
  content,
  shortcut,
  side = "top",
  children,
}: {
  content: React.ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-72 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-2"
        >
          {content}
          {shortcut ? <kbd className="num ml-2 text-text-3">{shortcut}</kbd> : null}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
