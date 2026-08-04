"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeanCanvas } from "@prisma/client";
import { completeIdeaGuideStep } from "./actions";
import { toggleChecklistItem } from "../(workspace)/edit/actions";
import InviteForm from "../(workspace)/invite/InviteForm";
import LeanCanvasGrid from "../(workspace)/lean-canvas/LeanCanvasGrid";
import GuideStepIndicator from "@/components/GuideStepIndicator";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";
import { IDEA_GUIDE_STEPS } from "@/lib/ideaGuideSteps";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";

// The sprint step doesn't move the project's actual phase forward (IDEA and
// SPRINT are merged into one visible "Idé" step everywhere — see
// projectPhase.ts) — it just lets founders get a head start on sprint prep
// while still in Idé. Reuses SPRINT's own first 5 checklist keys/labels so
// ticking them here already counts if the project later really enters
// SPRINT phase.
const SPRINT_PREP_ITEMS = INITIATIVE_CHECKLIST_ITEMS.SPRINT.slice(0, 5);

interface Props {
  projectId: string;
  slug: string;
  title: string;
  initialSdgGoals: number[];
  completedKeys: string[];
  leanCanvas: LeanCanvas | null;
}

// Steps 2-4 of the idea-phase guide — step 1 ("Beskriv projektet") both
// creates the Project and saves its description in one go on
// /projects/new (see NewProjectGuide.tsx), so this page starts one step
// further in.
export default function IdeaGuide({
  projectId,
  slug,
  title,
  initialSdgGoals,
  completedKeys,
  leanCanvas,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set(completedKeys));
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSdgGoals));
  const [isPending, startTransition] = useTransition();

  function toggleSdg(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function goToProject() {
    router.push(`/projects/${slug}`);
  }

  function handleSdgNext() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "ai_reviewed", Array.from(selected));
      setDone((prev) => new Set(prev).add("ai_reviewed"));
      setStep(1);
    });
  }

  function handleLeanCanvasNext() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "lean_canvas_created");
      setDone((prev) => new Set(prev).add("lean_canvas_created"));
      setStep(2);
    });
  }

  function handleFeedbackNext() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "peer_feedback_requested");
      setDone((prev) => new Set(prev).add("peer_feedback_requested"));
      setStep(3);
    });
  }

  function toggleSprintTask(itemKey: string) {
    const wasDone = done.has(itemKey);
    startTransition(async () => {
      await toggleChecklistItem(slug, "IDEA", itemKey, !wasDone);
      setDone((prev) => {
        const next = new Set(prev);
        if (wasDone) next.delete(itemKey); else next.add(itemKey);
        return next;
      });
    });
  }

  function handleSprintFinish() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "sprint_prepped");
      router.push(`/projects/${slug}`);
    });
  }

  return (
    <div className="py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-dark-slate">Snabbstart — {title}</h1>
        <button
          type="button"
          onClick={goToProject}
          className="text-sm text-dark-slate/50 hover:text-dark-slate"
        >
          Hoppa över guiden →
        </button>
      </div>
      <p className="text-sm text-dark-slate/60 mb-8">
        En valfri genomgång av idé-fasens delsteg. Hoppa över när som helst — inget här krävs.
      </p>

      {/* Step indicator — index 0 ("Beskriv projektet") is always done by
          the time this page renders, since it's what created the project. */}
      <GuideStepIndicator
        steps={IDEA_GUIDE_STEPS}
        currentIndex={step + 1}
        doneKeys={new Set(["dream_defined", ...done])}
        onStepClick={(i) => i > 0 && setStep(i - 1)}
      />

      {/* Step 2 — Välj SDG */}
      <div className={step === 0 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Välj SDG</label>
          <p className="text-xs text-dark-slate/50 mb-4">
            Här kan du välja SDG som kopplar till projektet.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SDG_NUMBERS.map((n) => {
              const label = SDG_LABELS_SV[n];
              const isChecked = selected.has(n);
              return (
                <label
                  key={n}
                  className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-3 transition-colors ${
                    isChecked ? "border-seagrass bg-seagrass/5" : "border-muted-teal/30 hover:border-seagrass/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked} onChange={() => toggleSdg(n)}
                    className="accent-seagrass w-4 h-4 flex-shrink-0"
                  />
                  <SdgIcon n={n} size={36} />
                  <span className={`text-xs ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60"}`}>
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSdgNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 3 — Lean Canvas */}
      <div className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Lean Canvas</label>
          <p className="text-xs text-dark-slate/50 mb-3">
            Ett enkelsidigt planeringsverktyg — problem, lösning, målgrupp, kanaler, intäkter.
          </p>
          <LeanCanvasGrid projectSlug={slug} canvas={leanCanvas} canEdit />
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(0)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleLeanCanvasNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 4 — Bjud in vänner */}
      <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Bjud in vänner</label>
          <p className="text-xs text-dark-slate/50 mb-3">
            Valfritt — community-feedback kan hjälpa dig förbättra idén, men ingen extern granskning krävs för att gå vidare.
          </p>
          <InviteForm projectId={projectId} slug={slug} />
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleFeedbackNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 5 — Sprint */}
      <div className={step === 3 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Sprint</label>
          <p className="text-xs text-dark-slate/50 mb-4">
            Valfritt — förbered sprint-arbetet redan nu genom att bocka av det som redan är klart.
          </p>
          <div className="flex flex-col gap-2">
            {SPRINT_PREP_ITEMS.map((item) => {
              const isChecked = done.has(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
                    isChecked ? "border-seagrass bg-seagrass/5" : "border-muted-teal/30 hover:border-seagrass/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked} onChange={() => toggleSprintTask(item.key)}
                    className="accent-seagrass w-4 h-4 flex-shrink-0"
                  />
                  <span className={`text-sm ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/70"}`}>
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(2)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSprintFinish}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Klar, ta mig till projektet"}
          </button>
        </div>
      </div>
    </div>
  );
}
