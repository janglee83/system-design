"use client";
import { useTranslations } from "next-intl";
import { EDGE_KINDS } from "@/i18n/engine-codes";

/** Colour and dash per connection kind, so kinds never differ by colour alone. */
export function EdgeLegend() {
  const t = useTranslations();
  return (
    <div className="rounded-lg border border-border bg-surface p-2 shadow-1">
      <p className="section-label mb-1">{t("lab.legend.title")}</p>
      <ul className="space-y-0.5">
        {EDGE_KINDS.map((k) => (
          <li key={k} data-testid={`legend-${k}`} className="flex items-center gap-2 text-xs text-text-2">
            <svg width="24" height="8" viewBox="0 0 24 8" aria-hidden className="shrink-0">
              <line
                x1="1"
                y1="4"
                x2="23"
                y2="4"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ stroke: `var(--sd-edge-${k})`, strokeDasharray: `var(--sd-dash-${k})` }}
              />
            </svg>
            {t(`edgeKind.${k}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
