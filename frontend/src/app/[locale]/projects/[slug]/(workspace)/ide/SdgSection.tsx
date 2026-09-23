"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { SdgIcon } from "@/components/SdgIcon";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import { SDG_LABELS_EN, SDG_LABELS_SV, SDG_NUMBERS } from "@/lib/sdg";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { completeIdeaGuideStep } from "../../guide/actions";

// "Globala mål" on the Idé overview: the chosen goals as icons, Edit opens
// the full list. Recommends 1–3 goals, like Snabbstart.
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
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set(goals));
  const [pending, startTransition] = useTransition();

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const list = [...selected].sort((a, b) => a - b);
      await completeIdeaGuideStep(slug, "ai_reviewed", list.length > 0, list);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div>
        <p className={`mb-3 text-xs ${selected.size > 5 ? "font-medium text-watermelon" : "text-dark-slate/60"}`}>
          {selected.size > 5 ? t("sdgTooMany", { count: selected.size }) : t("sdgRecommendation")}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {SDG_NUMBERS.map((n) => (
            <label
              key={n}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                selected.has(n) ? "border-seagrass bg-seagrass/10" : "border-muted-teal/40"
              }`}
            >
              <input type="checkbox" checked={selected.has(n)} onChange={() => toggle(n)} className="accent-seagrass" />
              <SdgIcon n={n} size={28} />
              <span>{labels[n]}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60">
            {pending ? t("saving") : t("save")}
          </button>
          <button type="button" onClick={() => { setSelected(new Set(goals)); setEditing(false); }} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

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
      <div className="ml-auto flex items-center gap-3">
        <FieldProvenanceBadge projectSlug={slug} entity="project" field="sdgGoals" info={provenance} hasContent={goals.length > 0} canEdit={canEdit} />
        {canEdit && (
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-dark-slate/50 hover:text-coral">
            {t("edit")}
          </button>
        )}
      </div>
    </div>
  );
}
