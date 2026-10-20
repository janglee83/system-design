"use client";
import * as A from "@radix-ui/react-accordion";
import { ChevronRight } from "lucide-react";

/** A collapsible inspector section with a section-label heading. */
export function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <A.Root type="single" collapsible defaultValue={defaultOpen ? "s" : undefined} className="border-t border-border">
      <A.Item value="s">
        <A.Header>
          <A.Trigger className="group section-label flex h-8 w-full items-center gap-1 text-left">
            <ChevronRight size={12} aria-hidden className="transition-transform duration-120 group-data-[state=open]:rotate-90" />
            {title}
          </A.Trigger>
        </A.Header>
        <A.Content className="pb-2">{children}</A.Content>
      </A.Item>
    </A.Root>
  );
}
