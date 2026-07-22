"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveIdeaDescription, getIdeaAiReview, completeIdeaGuideStep } from "./actions";
import InviteForm from "../(workspace)/invite/InviteForm";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";
import { INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { isCommercialLegalType } from "@/lib/legalType";

const STEPS = INITIATIVE_CHECKLIST_ITEMS.IDEA;

// Project has no dedicated problem/solution columns — best-effort split of
// the combined `description` back into the two questions this step asks,
// so re-opening the guide doesn't lose previously entered content.
function splitDescription(description: string): { problem: string; solution: string } {
  const marker = "\n\n**Lösning:**\n";
  const idx = description.indexOf(marker);
  if (idx === -1) {
    return { problem: description.replace(/^\*\*Problem:\*\*\n/, ""), solution: "" };
  }
  return {
    problem: description.slice(0, idx).replace(/^\*\*Problem:\*\*\n/, ""),
    solution: description.slice(idx + marker.length),
  };
}

interface Props {
  projectId: string;
  slug: string;
  title: string;
  initialSummary: string;
  initialDescription: string;
  initialSdgGoals: number[];
  initialLegalType: string;
  completedKeys: string[];
}

export default function IdeaGuide({
  projectId,
  slug,
  title,
  initialSummary,
  initialDescription,
  initialSdgGoals,
  initialLegalType,
  completedKeys,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set(completedKeys));
  const [summary, setSummary] = useState(initialSummary);
  const [{ problem, solution }, setProblemSolution] = useState(() => splitDescription(initialDescription));
  const [legalType, setLegalType] = useState<"NONPROFIT_UMBRELLA" | "COMMERCIAL_UMBRELLA">(
    isCommercialLegalType(initialLegalType) ? "COMMERCIAL_UMBRELLA" : "NONPROFIT_UMBRELLA"
  );
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSdgGoals));
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();

  function setProblem(value: string) {
    setProblemSolution((prev) => ({ ...prev, problem: value }));
  }
  function setSolution(value: string) {
    setProblemSolution((prev) => ({ ...prev, solution: value }));
  }

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

  function handleDescriptionNext() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("summary", summary);
      formData.set("problem", problem);
      formData.set("solution", solution);
      formData.set("legalType", legalType);
      await saveIdeaDescription(slug, formData);
      setDone((prev) => new Set(prev).add("dream_defined"));
      setStep(1);
    });
  }

  function handleAiSuggest() {
    startTransition(async () => {
      const result = await getIdeaAiReview(`${problem}\n\n${solution}`);
      if (result) {
        setAiSuggested(result.goals);
        setReasoning(result.reasoning);
        setSelected(new Set(result.goals));
      }
    });
  }

  function handleAiReviewNext() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "ai_reviewed", Array.from(selected));
      setDone((prev) => new Set(prev).add("ai_reviewed"));
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

  function handleFinish(goToLeanCanvas: boolean) {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "lean_canvas_created");
      router.push(goToLeanCanvas ? `/projects/${slug}/lean-canvas` : `/projects/${slug}`);
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

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === i ? "text-seagrass" : done.has(s.key) ? "text-dark-slate/60" : "text-dark-slate/30"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === i ? "bg-seagrass text-white" : done.has(s.key) ? "bg-dry-sage text-dark-slate" : "bg-gray-100 text-gray-400"
              }`}>
                {done.has(s.key) ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-muted-teal/30 mx-3" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Beskriv idén */}
      <div className={step === 0 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
            Kort sammanfattning <span className="text-dark-slate/50 font-normal">(visas på projektkortet)</span>
          </label>
          <textarea
            id="summary" rows={2}
            value={summary} onChange={(e) => setSummary(e.target.value)}
            placeholder="1–2 meningar"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>
        <div>
          <label htmlFor="problem" className="block text-sm font-medium text-dark-slate mb-1">
            Vilket problem löser den här idén?
          </label>
          <p className="text-xs text-dark-slate/50 mb-2">Beskriv grundorsaken — vad är trasigt, vem drabbas, varför spelar det roll?</p>
          <textarea
            id="problem" rows={4}
            value={problem} onChange={(e) => setProblem(e.target.value)}
            placeholder="Beskriv problemet..."
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>
        <div>
          <label htmlFor="solution" className="block text-sm font-medium text-dark-slate mb-1">
            Hur föreslår du att lösa det?
          </label>
          <p className="text-xs text-dark-slate/50 mb-2">Vad skulle byggas, vem skulle göra det, vad är själva förändringsmekanismen?</p>
          <textarea
            id="solution" rows={4}
            value={solution} onChange={(e) => setSolution(e.target.value)}
            placeholder="Beskriv din lösning..."
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Ideellt eller kommersiellt? <span className="text-dark-slate/50 font-normal">(se 4c — kan ändras senare)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-start gap-2 border border-muted-teal rounded-md px-3 py-2 cursor-pointer hover:border-seagrass/60 transition-colors">
              <input
                type="radio" name="legalTypeChoice" value="NONPROFIT_UMBRELLA"
                checked={legalType === "NONPROFIT_UMBRELLA"}
                onChange={() => setLegalType("NONPROFIT_UMBRELLA")}
                className="mt-0.5 accent-seagrass"
              />
              <span className="text-xs text-dark-slate/80">Ideellt</span>
            </label>
            <label className="flex items-start gap-2 border border-muted-teal rounded-md px-3 py-2 cursor-pointer hover:border-seagrass/60 transition-colors">
              <input
                type="radio" name="legalTypeChoice" value="COMMERCIAL_UMBRELLA"
                checked={legalType === "COMMERCIAL_UMBRELLA"}
                onChange={() => setLegalType("COMMERCIAL_UMBRELLA")}
                className="mt-0.5 accent-seagrass"
              />
              <span className="text-xs text-dark-slate/80">Kommersiellt</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleDescriptionNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 2 — Be AI granska idén */}
      <div className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-sm font-medium text-dark-slate">Be AI granska idén</label>
              <p className="text-xs text-dark-slate/50">AI föreslår relevanta Agenda 2030-mål utifrån din beskrivning</p>
            </div>
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={isPending || (problem + solution).trim().length < 20}
              className="flex items-center gap-1.5 text-xs font-medium text-seagrass hover:text-dark-slate transition-colors disabled:opacity-50"
            >
              {isPending ? "Analyserar…" : "✨ Be AI granska"}
            </button>
          </div>
          {reasoning && <p className="text-xs text-dark-slate/50 mb-2 italic">{reasoning}</p>}
          <div className="grid grid-cols-2 gap-2">
            {SDG_NUMBERS.map((n) => {
              const label = SDG_LABELS_SV[n];
              const isChecked = selected.has(n);
              const isSuggested = aiSuggested.includes(n);
              return (
                <label key={n} className={`flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 ${isSuggested && isChecked ? "bg-seagrass/10" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isChecked} onChange={() => toggleSdg(n)}
                    className="accent-seagrass w-4 h-4 flex-shrink-0"
                  />
                  <SdgIcon n={n} size={20} />
                  <span className={`text-xs ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60"}`}>
                    {label}
                  </span>
                  {isSuggested && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-seagrass">AI</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(0)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleAiReviewNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 3 — Bjud in vänner att ge feedback */}
      <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Bjud in vänner att ge feedback</label>
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

      {/* Step 4 — Gör en Lean Canvas */}
      <div className={step === 3 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-1">Gör en Lean Canvas</label>
          <p className="text-xs text-dark-slate/50 mb-3">
            Ett enkelsidigt planeringsverktyg — problem, lösning, målgrupp, kanaler, intäkter.
          </p>
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(2)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleFinish(false)}
              className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2 disabled:opacity-60"
            >
              Klar, ta mig till projektet
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleFinish(true)}
              className="px-6 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors disabled:opacity-60"
            >
              {isPending ? "Sparar…" : "Skapa Lean Canvas →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
