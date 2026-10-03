"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { SdgIcon } from "@/components/SdgIcon";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import { SDG_LABELS_EN, SDG_LABELS_SV, SDG_NUMBERS } from "@/lib/sdg";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { completeIdeaGuideStep } from "../../guide/actions";
import { chooseSdgGoalsWithAi } from "./actions";

// "Globala mål" on the Idé overview. For the team, all 17 goals are tiles:
// a click picks or drops a goal and saves at once (no Edit step). Everyone
// else sees the chosen goals. Recommends 1–3 goals, like Snabbstart.
export default function SdgSection({
  slug,
  goals,
  provenance,
  canEdit,
}: {
  slug: string;
  goals: number[];
  provenance: ProvenanceInfo | undefined;
  canEdit: boolean;
}) {
  const t = useTranslations("IdeaOverview");
  const locale = useLocale();
  const labels = locale === "en" ? SDG_LABELS_EN : SDG_LABELS_SV;
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set(goals));
  const [, startTransition] = useTransition();
  function toggle(n: number) {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelected(next);
    const list = [...next].sort((a, b) => a - b);
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "ai_reviewed", list.length > 0, list);
      router.refresh();
    });
  }

  // Follows a server-side change (the AI's choice, SdgAiButton).
  const goalsKey = goals.join(",");
  useEffect(() => setSelected(new Set(goalsKey ? goalsKey.split(",").map(Number) : [])), [goalsKey]);

  if (!canEdit) {
    return (
      <div className="flex flex-wrap items-start gap-3">
        {goals.length === 0 ? (
          <p className="text-sm text-dark-slate/50">{t("sdgEmpty")}</p>
        ) : (
          goals.map((n) => (
            <div key={n} className="flex w-24 flex-col items-center gap-1 text-center">
              <SdgIcon n={n} size={56} />
              <span className="text-[11px] leading-tight text-dark-slate/70">{labels[n]}</span>
            </div>
          ))
        )}
        <div className="ml-auto">
          <FieldProvenanceBadge projectSlug={slug} entity="project" field="sdgGoals" info={provenance} hasContent={goals.length > 0} canEdit={false} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${selected.size > 5 ? "font-medium text-watermelon" : "text-dark-slate/60"}`}>
          {selected.size > 5 ? t("sdgTooMany", { count: selected.size }) : t("sdgRecommendation")}
        </p>
        <FieldProvenanceBadge projectSlug={slug} entity="project" field="sdgGoals" info={provenance} hasContent={selected.size > 0} canEdit />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
        {SDG_NUMBERS.map((n) => {
          const on = selected.has(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              aria-pressed={on}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition ${
                on ? "bg-seagrass/10 ring-2 ring-seagrass" : "hover:bg-dry-sage/20"
              }`}
            >
              <span className={`transition ${on ? "" : "opacity-45 grayscale group-hover:opacity-100 group-hover:grayscale-0"}`}>
                <SdgIcon n={n} size={64} />
              </span>
              <span className={`text-[11px] leading-tight ${on ? "font-medium text-dark-slate" : "text-dark-slate/55"}`}>{labels[n]}</span>
              {on && (
                <span aria-hidden className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-seagrass text-[11px] font-bold text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// "Låt AI:n välja mål", under the goals' frame like the canvases' review box.
// The AI picks up to three goals, they replace the selection (marked as
// Antagande), and its reason shows here.
export function SdgAiButton({ slug }: { slug: string }) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  function letAiChoose() {
    setNote(null);
    startTransition(async () => {
      const res = await chooseSdgGoalsWithAi(slug);
      if ("error" in res) {
        setNote({ text: res.error, error: true });
        return;
      }
      setNote({ text: res.reasoning, error: false });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4 text-center">
      <p className="text-sm text-dark-slate/70">{t("sdgAiIntro")}</p>
      <button
        type="button"
        onClick={letAiChoose}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60"
      >
        <span aria-hidden>✨</span>
        {pending ? t("sdgAiChoosing") : t("sdgAiChoose")}
      </button>
      {note && <p className={`max-w-lg text-xs ${note.error ? "text-watermelon" : "text-dark-slate/60"}`}>{note.text}</p>}
    </div>
  );
}
