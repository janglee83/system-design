"use client";
import * as T from "@radix-ui/react-tooltip";
import { useTranslations } from "next-intl";
import { NodeArt } from "../canvas/art/NodeArt";
import { categoryColor, kindArt } from "../canvas/kinds";
import type { CatalogItem } from "./palette-model";

/**
 * The hover/focus card beside a palette row (design-system §3): 300 ms after hover, at once on
 * focus. Read-only, so a tooltip is the right primitive.
 */
export function KindCard({ item, price, children }: { item: CatalogItem; price: number | null | undefined; children: React.ReactNode }) {
  const t = useTranslations();
  const art = kindArt(item.kind);
  const accepts = item.meta ? item.meta.accepts.map((k) => t(`edgeKind.${k}`)).join(", ") : null;
  return (
    <T.Root delayDuration={300}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side="right"
          align="start"
          sideOffset={10}
          className="z-50 w-[300px] rounded-lg border border-border bg-surface p-3 text-body text-text shadow-3"
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-14 shrink-0 place-items-center rounded-sm"
              style={{ color: categoryColor(item.kind), background: `color-mix(in srgb, ${categoryColor(item.kind)} 10%, var(--sd-surface))` }}
            >
              {art ? <NodeArt kind={art} width={40} height={30} /> : null}
            </span>
            <div className="min-w-0">
              <p className="text-heading">{item.name}</p>
              <p className="text-caption text-text-3">{t(`paletteCategory.${item.category}.name`)}</p>
            </div>
          </div>
          <p className="mt-2 text-text-2">{item.description}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption">
            <dt className="text-text-3">{t("palette.card.status")}</dt>
            <dd>{t(`palette.card.${item.status}`)}</dd>
            {item.status === "ready" ? (
              <>
                <dt className="text-text-3">{t("palette.card.price")}</dt>
                <dd className="num">{typeof price === "number" ? t("palette.card.perMonth", { price: Math.round(price) }) : "—"}</dd>
                <dt className="text-text-3">{t("palette.card.accepts")}</dt>
                <dd>{accepts || t("palette.card.acceptsNone")}</dd>
              </>
            ) : null}
          </dl>
          {item.status !== "ready" ? (
            <p className="mt-2 rounded-md bg-surface-2 px-2 py-1.5 text-caption text-text-2">{t("palette.card.soonNote")}</p>
          ) : !item.allowed ? (
            <p className="mt-2 rounded-md bg-surface-2 px-2 py-1.5 text-caption text-text-2">{t("palette.card.notAllowed")}</p>
          ) : null}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
