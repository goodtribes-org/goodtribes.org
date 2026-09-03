"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toggleChecklistItem } from "../../(workspace)/edit/actions";
import GuideStepIndicator from "@/components/GuideStepIndicator";
import type { ProjectPhaseValue } from "@/lib/projectPhase";

interface ChecklistItemDef {
  key: string;
  label: string;
  href?: string;
}

interface Props {
  slug: string;
  phase: ProjectPhaseValue;
  phaseLabel: string;
  projectTitle: string;
  items: ChecklistItemDef[];
  completedKeys: string[];
  // Set from the phase-menu checklist's `?step=<itemKey>` deep link (see
  // PhaseMenuBar.tsx) so clicking a checklist item's text lands directly on
  // that step instead of always step 0.
  initialStepIndex?: number;
}

// A generic, checklist-driven guide for every phase after Idé (which has
// its own bespoke guide — see ../IdeaGuide.tsx). Each step is just one
// checklist item: an optional link to the relevant tool, plus a checkbox
// that toggles it done via the same action the project's edit page and
// phase-menu checklist popover already use — so ticking it here is the
// exact same thing as ticking it anywhere else in the app.
export default function PhaseGuide({ slug, phase, phaseLabel, projectTitle, items, completedKeys, initialStepIndex }: Props) {
  const t = useTranslations("PhaseGuide");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const router = useRouter();
  const [step, setStep] = useState(initialStepIndex ?? 0);
  const [done, setDone] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();

  function goToProject() {
    router.push(`/projects/${slug}`);
  }

  function toggleItem(itemKey: string) {
    const wasDone = done.has(itemKey);
    startTransition(async () => {
      await toggleChecklistItem(slug, phase, itemKey, !wasDone);
      setDone((prev) => {
        const next = new Set(prev);
        if (wasDone) next.delete(itemKey); else next.add(itemKey);
        return next;
      });
    });
  }

  const current = items[step];
  const isLast = step === items.length - 1;

  // Advancing past a step is itself the confirmation that it's done — mark
  // it (idempotent, no-op if already checked) instead of requiring a
  // separate checkbox click before "Nästa".
  function goNext() {
    if (!done.has(current.key)) toggleItem(current.key);
    if (isLast) goToProject(); else setStep((s) => s + 1);
  }

  return (
    <div className="py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-dark-slate">{t("title", { phaseLabel, projectTitle })}</h1>
        <button
          type="button"
          onClick={goToProject}
          className="text-sm text-dark-slate/50 hover:text-dark-slate"
        >
          {t("skipGuide")}
        </button>
      </div>
      <p className="text-sm text-dark-slate/60 mb-8">
        {t("subtitle", { phaseLabel: phaseLabel.toLowerCase() })}
      </p>

      <GuideStepIndicator
        steps={items.map((item) => ({ key: item.key, label: tChecklist(item.key) }))}
        currentIndex={step}
        doneKeys={done}
        onStepClick={(i) => setStep(i)}
      />

      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-muted-teal/30 p-5">
          <p className="text-base font-semibold text-dark-slate mb-3">{tChecklist(current.key)}</p>
          {current.href && (
            <a
              href={`/projects/${slug}/${current.href}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-seagrass hover:underline mb-4"
            >
              {t("openLink")}
            </a>
          )}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={done.has(current.key)}
              disabled={isPending}
              onChange={() => toggleItem(current.key)}
              className="accent-seagrass w-4 h-4"
            />
            <span className="text-sm text-dark-slate/80">{t("markDone")}</span>
          </label>
        </div>
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2 disabled:opacity-30"
          >
            {t("back")}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {isLast ? t("finish") : t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
