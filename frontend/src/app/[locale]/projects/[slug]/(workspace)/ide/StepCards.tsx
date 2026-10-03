"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createStepCard } from "./actions";

export type StepCard = { id: string; title: string; column: string; assignee: { name: string | null; image: string | null } | null };

// The step's kanban cards, behind one small marker in the step's title row
// — "☐ 2 uppgifter", "✓ Alla klara" or "+ Uppgift" —
// so the work behind the document is a click away without taking the
// canvas's room. The list links each card to the board, and "+ Ny uppgift
// för steget" makes a card already tied to the phase and step.
export default function StepCards({ slug, stepKey, cards, canEdit }: { slug: string; stepKey: string; cards: StepCard[]; canEdit: boolean }) {
  const t = useTranslations("StepCards");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const done = cards.filter((c) => c.column === "DONE").length;
  const openCount = cards.length - done;
  const label = cards.length === 0 ? t("none") : openCount === 0 ? t("allDone") : t("open", { count: openCount });

  function add() {
    setError(null);
    start(async () => {
      const res = await createStepCard(slug, stepKey, title);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  if (cards.length === 0 && !canEdit) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${
          cards.length > 0 && openCount === 0 ? "border-seagrass/40 text-seagrass" : "border-dark-slate/20 text-dark-slate/70"
        } hover:border-dark-slate/40 hover:text-dark-slate`}
      >
        <span aria-hidden>{cards.length > 0 && openCount === 0 ? "✓" : cards.length === 0 ? "+" : "☐"}</span>
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-muted-teal/30 bg-white p-3 text-left shadow-lg">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{t("heading")}</p>
          {cards.length === 0 ? (
            <p className="text-sm text-dark-slate/60">{t("empty")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {cards.map((c) => (
                <li key={c.id}>
                  <Link href={`/projects/${slug}/tasks?card=${c.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-dry-sage/20">
                    <span className={`min-w-0 flex-1 truncate ${c.column === "DONE" ? "text-dark-slate/50 line-through" : "text-dark-slate"}`}>{c.title}</span>
                    {c.assignee &&
                      (c.assignee.image ? (
                        <img src={c.assignee.image} alt={c.assignee.name ?? ""} className="h-5 w-5 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span title={c.assignee.name ?? ""} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-dry-sage text-[10px] font-semibold text-dark-slate">
                          {(c.assignee.name ?? "?").slice(0, 1)}
                        </span>
                      ))}
                    <span className="shrink-0 text-[11px] text-dark-slate/50">{t(`columns.${c.column}` as never)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
              className="mt-2 flex gap-2 border-t border-muted-teal/20 pt-2"
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("newPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-muted-teal/40 px-2 py-1 text-sm focus:border-seagrass focus:outline-none"
              />
              <button type="submit" disabled={pending || !title.trim()} className="rounded-lg bg-dark-slate px-2.5 py-1 text-sm font-medium text-white disabled:opacity-40">
                {pending ? "…" : t("add")}
              </button>
            </form>
          )}
          {error && <p className="mt-1 text-xs text-watermelon">{error}</p>}
        </div>
      )}
    </div>
  );
}
