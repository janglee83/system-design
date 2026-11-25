"use client";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/Tooltip";

export interface StripLevel {
  id: string;
  title: string;
  lessons: number;
  /** 0..1 of the level's lessons done. */
  progress: number;
  /** The earlier level whose exit check is still open, or null when unlocked. */
  lockedBy: string | null;
}

/** The 7 level cards (design-system §11). A locked level stays clickable: it opens a read-only preview. */
export function LevelStrip({ levels, current, selected, onSelect }: { levels: readonly StripLevel[]; current: string; selected: string; onSelect: (id: string) => void }) {
  const t = useTranslations("learn");
  return (
    <nav aria-label={t("levels")} className="grid grid-cols-7 gap-1.5">
      {levels.map((l) => {
        const reason = l.lockedBy ? t("locked", { level: l.lockedBy.replace("L", "") }) : null;
        const card = (
          <button
            key={l.id}
            type="button"
            data-testid={`level-${l.id}`}
            aria-current={selected === l.id ? "true" : undefined}
            aria-describedby={reason ? `lock-${l.id}` : undefined}
            onClick={() => onSelect(l.id)}
            className={cn(
              "flex min-h-[84px] flex-col gap-1 rounded-md border border-border bg-surface p-2.5 text-left hover:bg-surface-2",
              l.id === current && "border-accent-text shadow-[0_0_0_3px_var(--sd-accent-soft)]",
              selected === l.id && l.id !== current && "border-border-strong",
              // Locked: muted but readable (not opacity, which fails contrast), dashed, with a lock icon.
              l.lockedBy && "border-dashed bg-surface-2 text-text-2",
            )}
          >
            <span className="num flex items-center gap-1 text-[11.5px] text-text-3">
              {t("levelCard", { id: l.id, count: l.lessons })}
              {l.lockedBy ? <Lock size={11} aria-hidden className="ml-auto" /> : null}
            </span>
            <span className="line-clamp-2 text-[13px] leading-[18px] font-semibold">{l.title}</span>
            <span aria-hidden className="mt-auto h-1 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full bg-ok" style={{ width: `${l.progress * 100}%` }} />
            </span>
            {reason ? (
              <span id={`lock-${l.id}`} className="sr-only">
                {reason}
              </span>
            ) : null}
          </button>
        );
        return reason ? (
          <Tooltip key={l.id} content={reason} side="bottom">
            {card}
          </Tooltip>
        ) : (
          card
        );
      })}
    </nav>
  );
}
