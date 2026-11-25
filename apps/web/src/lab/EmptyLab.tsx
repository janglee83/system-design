"use client";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/ui/cn";
import { NodeArt } from "./canvas/art/NodeArt";
import { categoryColor, kindArt } from "./canvas/kinds";
import { useDocActions } from "./designs/use-doc-actions";
import { usePaletteDrag } from "./palette/use-palette-drag";
import { formatCombo } from "./shortcuts";
import { templateCards, type ChallengeStart } from "./templates";
import { useIsMac } from "./use-shortcuts";

const HERO = ["client", "web-server", "postgres"];

/** A row of small kind tiles on the canvas grid (a template card's preview). */
function Strip({ kinds }: { kinds: readonly string[] }) {
  return (
    <div
      aria-hidden
      className="flex h-[54px] items-center justify-center gap-2 rounded-md bg-canvas"
      style={{ backgroundImage: "radial-gradient(var(--sd-grid) 1px, transparent 1.2px)", backgroundSize: "12px 12px" }}
    >
      {kinds.map((k, i) => {
        const art = kindArt(k);
        return (
          <span key={`${k}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span className="h-px w-3 border-t border-dashed border-border-strong" /> : null}
            <span className="grid h-8 w-10 place-items-center rounded-sm border border-border bg-surface" style={{ color: categoryColor(k) }}>
              {art ? <NodeArt kind={art} width={28} height={21} /> : null}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** The empty Lab (design-system §9): a hero, three template cards and a hint. */
export function EmptyLab({ starts }: { starts: readonly ChallengeStart[] }) {
  const t = useTranslations();
  const actions = useDocActions();
  const router = useRouter();
  const mac = useIsMac();
  const cards = templateCards(starts);
  // While a component is dragged from the palette, step aside so the drop reaches the canvas.
  const dragging = usePaletteDrag();
  const card = "flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left shadow-1 transition-[box-shadow,transform] duration-(--sd-t-fast) hover:-translate-y-px hover:shadow-2";
  return (
    <div data-testid="empty-lab" className="pointer-events-none absolute inset-0 grid place-items-center overflow-y-auto p-6">
      <div
        className={cn(
          "flex w-full max-w-[720px] flex-col items-center gap-5 text-center transition-opacity duration-(--sd-t-fast)",
          dragging ? "pointer-events-none opacity-30" : "pointer-events-auto",
        )}
      >
        <div aria-hidden className="flex items-center gap-3">
          {HERO.map((k, i) => (
            <span key={k} className="flex items-center gap-3">
              {i > 0 ? <span className="h-px w-10 border-t-2 border-dashed border-border-strong" /> : null}
              <NodeArt kind={kindArt(k)!} width={80} height={60} style={{ color: categoryColor(k) }} />
            </span>
          ))}
        </div>
        <div>
          <h2 className="text-title">{t("lab.empty.title")}</h2>
          <p className="mt-1 text-body text-text-2">{t("lab.empty.body")}</p>
        </div>
        <ul className="grid w-full grid-cols-3 gap-3">
          {cards.map((c) =>
            c.kind === "builtin" ? (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => actions.newFrom(c.id)}
                  className={cn(card, "h-full w-full", c.suggested && "outline-2 outline-offset-0 outline-accent-text")}
                >
                  <Strip kinds={c.kinds} />
                  <span className="text-body font-semibold">{t(`templates.${c.id}`)}</span>
                  <span className="text-caption text-text-3">{t(`lab.empty.${c.id}Line`)}</span>
                </button>
                {c.suggested ? (
                  <span className="pointer-events-none absolute -top-2 right-3 rounded-full bg-accent px-2 text-[11px] leading-[18px] font-semibold text-on-accent">
                    {t("lab.empty.suggested")}
                  </span>
                ) : null}
              </li>
            ) : (
              <li key="challenges" className={cn(card, "min-w-0 justify-start")}>
                <Strip kinds={c.starts[0]?.kinds ?? []} />
                <span className="text-body font-semibold">{t("lab.empty.challenges")}</span>
                <ul className="flex min-w-0 flex-col gap-0.5">
                  {c.starts.map((s) => (
                    <li key={s.id} className="min-w-0">
                      <button
                        type="button"
                        title={s.title}
                        onClick={() => router.push(`/lab?challenge=${s.id}`)}
                        className="block min-h-6 w-full truncate py-1 text-left text-caption text-accent-text hover:underline"
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-auto text-caption text-text-3">
                  <Link href="/challenges" className="hover:text-text-2 hover:underline">
                    {t("lab.empty.seeAll")}
                  </Link>
                  {c.more > 0 ? <span className="ml-1.5">{t("lab.empty.more", { count: c.more })}</span> : null}
                </p>
              </li>
            ),
          )}
        </ul>
        <p className="text-caption text-text-3">{t("lab.empty.footer", { palette: formatCombo("Mod+K", mac) })}</p>
      </div>
    </div>
  );
}
