"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
}

// A generic, checklist-driven guide for every phase after Idé (which has
// its own bespoke guide — see ../IdeaGuide.tsx). Each step is just one
// checklist item: an optional link to the relevant tool, plus a checkbox
// that toggles it done via the same action the project's edit page and
// phase-menu checklist popover already use — so ticking it here is the
// exact same thing as ticking it anywhere else in the app.
export default function PhaseGuide({ slug, phase, phaseLabel, projectTitle, items, completedKeys }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
        <h1 className="text-xl font-bold text-dark-slate">{phaseLabel}-guiden — {projectTitle}</h1>
        <button
          type="button"
          onClick={goToProject}
          className="text-sm text-dark-slate/50 hover:text-dark-slate"
        >
          Hoppa över guiden →
        </button>
      </div>
      <p className="text-sm text-dark-slate/60 mb-8">
        En valfri genomgång av checklistan för {phaseLabel.toLowerCase()}. Hoppa över när som helst — inget här krävs.
      </p>

      <GuideStepIndicator
        steps={items}
        currentIndex={step}
        doneKeys={done}
        onStepClick={(i) => setStep(i)}
      />

      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-muted-teal/30 p-5">
          <p className="text-base font-semibold text-dark-slate mb-3">{current.label}</p>
          {current.href && (
            <a
              href={`/projects/${slug}/${current.href}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-seagrass hover:underline mb-4"
            >
              Öppna →
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
            <span className="text-sm text-dark-slate/80">Markera som klar</span>
          </label>
        </div>
        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2 disabled:opacity-30"
          >
            ← Tillbaka
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            {isLast ? "Klar, ta mig till projektet" : "Nästa →"}
          </button>
        </div>
      </div>
    </div>
  );
}
