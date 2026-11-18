"use client";
import { useLocale } from "next-intl";
import { useEffect, useMemo } from "react";
import type { ContentIndex } from "@/content/types";
import { useRouter } from "@/i18n/navigation";
import { both } from "@/i18n/both";
import { isMacPlatform, matches } from "@/lab/shortcuts";
import { useMetas } from "@/lab/use-metas";
import { CommandPalette } from "./CommandPalette";
import { CommandRegistryProvider, usePaletteOpen, useRegisteredCommands } from "./command-registry";
import type { SearchItem } from "./search";

/** The command palette for every shell page: content and components here, page commands registered by the page. */
export function ShellClient({ index, children }: { index: ContentIndex; children: React.ReactNode }) {
  return (
    <CommandRegistryProvider>
      {children}
      <Palette index={index} />
    </CommandRegistryProvider>
  );
}

function Palette({ index }: { index: ContentIndex }) {
  const locale = useLocale();
  const router = useRouter();
  const metas = useMetas();
  const registered = useRegisteredCommands();
  const open = usePaletteOpen((s) => s.open);
  const setOpen = usePaletteOpen((s) => s.setOpen);

  // Mod+K anywhere in the shell (not only the Lab).
  useEffect(() => {
    const mac = isMacPlatform();
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || !matches(e, "Mod+K", mac)) return;
      e.preventDefault();
      setOpen(!usePaletteOpen.getState().open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const items = useMemo(() => {
    const base: SearchItem[] = [
      // Outside the Lab a component opens an empty Lab; the Lab registers items that add it.
      ...[...metas.values()].map((m) => ({
        id: `cmp-${m.kind}`,
        group: "component" as const,
        title: both(m.labelKey),
        subtitle: both(`componentDescription.${m.kind}`),
        keywords: [m.kind],
        run: () => router.push("/lab?template=empty"),
      })),
      ...index.lessons.map((l) => ({
        id: `lesson-${l.id}`,
        group: "lesson" as const,
        title: { vi: l.titleVi, en: l.titleEn },
        keywords: l.concepts,
        run: () => router.push(`/learn#${l.id}`),
      })),
      ...index.challenges.map((c) => ({
        id: `challenge-${c.id}`,
        group: "challenge" as const,
        title: { vi: c.titleVi, en: c.titleEn },
        keywords: [c.id],
        run: () => router.push(`/lab?challenge=${c.id}`),
      })),
    ];
    const byId = new Map(base.map((i) => [i.id, i]));
    for (const r of registered) byId.set(r.id, r); // a page's own item replaces the shell's
    return [...byId.values()];
  }, [metas, index, registered, router]);

  return <CommandPalette open={open} onOpenChange={setOpen} items={items} locale={locale} />;
}
