"use client";

import { useState, useTransition, useRef } from "react";
import { createIdea, getSdgSuggestions } from "./actions";
import FileUpload from "@/components/FileUpload";

const CATEGORIES = [
  "Technology", "Environment", "Education", "Health",
  "Community", "Policy", "Arts & Culture", "Economy",
];

const SDG_GOALS = [
  { n: 1, label: "No Poverty" }, { n: 2, label: "Zero Hunger" },
  { n: 3, label: "Good Health" }, { n: 4, label: "Quality Education" },
  { n: 5, label: "Gender Equality" }, { n: 6, label: "Clean Water" },
  { n: 7, label: "Clean Energy" }, { n: 8, label: "Decent Work" },
  { n: 9, label: "Industry & Innovation" }, { n: 10, label: "Reduced Inequalities" },
  { n: 11, label: "Sustainable Cities" }, { n: 12, label: "Responsible Consumption" },
  { n: 13, label: "Climate Action" }, { n: 14, label: "Life Below Water" },
  { n: 15, label: "Life on Land" }, { n: 16, label: "Peace & Justice" },
  { n: 17, label: "Partnerships" },
];

const STEPS = [
  { id: "basics",  label: "Basics" },
  { id: "detail",  label: "Problem & Solution" },
  { id: "impact",  label: "Impact" },
];

export default function NewIdeaForm() {
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [publishNow, setPublishNow] = useState(true);
  const imageRef = useRef<HTMLInputElement>(null);

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function handleSuggest() {
    startTransition(async () => {
      const result = await getSdgSuggestions(problem);
      if (result) {
        setAiSuggested(result.goals);
        setReasoning(result.reasoning);
        setSelected(new Set(result.goals));
      }
    });
  }

  function handleImageUpload(url: string) {
    if (imageRef.current) imageRef.current.value = url;
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => { await createIdea(formData); });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-0">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === i ? "text-seagrass" : i < step ? "text-dark-slate/60" : "text-dark-slate/30"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === i ? "bg-seagrass text-white" : i < step ? "bg-dry-sage text-dark-slate" : "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-muted-teal/30 mx-3" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      <div className={step === 0 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
            Idea title <span className="text-watermelon">*</span>
          </label>
          <input
            id="title" name="title" type="text" required
            placeholder="Give your idea a clear, compelling title"
            className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">Category</label>
            <select
              id="category" name="category"
              className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <option value="">— select —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="targetRegion" className="block text-sm font-medium text-dark-slate mb-1">Scope</label>
            <select
              id="targetRegion" name="targetRegion"
              className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              <option value="global">Global</option>
              <option value="national">National</option>
              <option value="regional">Regional</option>
              <option value="local">Local</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-dark-slate mb-1">
            Tags <span className="text-dark-slate/50 font-normal">(comma-separated)</span>
          </label>
          <input
            id="tags" name="tags" type="text"
            placeholder="e.g. ocean, plastic, youth, africa"
            className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Cover image <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <FileUpload visibility="public" accept="image/*" onUpload={handleImageUpload} />
          <input type="hidden" name="imageUrl" ref={imageRef} />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Next: Problem & Solution →
          </button>
        </div>
      </div>

      {/* Step 2: Problem & Solution */}
      <div className={step === 1 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label htmlFor="problem" className="block text-sm font-medium text-dark-slate mb-1">
            What problem does this solve? <span className="text-watermelon">*</span>
          </label>
          <p className="text-xs text-dark-slate/50 mb-2">
            Describe the root cause. Be specific — what&apos;s broken, who suffers, why it matters.
          </p>
          <textarea
            id="problem" name="problem" rows={5} required
            value={problem} onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g. Millions of tonnes of plastic end up in oceans each year, killing marine life and entering our food chain. Existing recycling infrastructure is fragmented and inaccessible to most communities..."
            className="w-full border border-muted-teal rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        <div>
          <label htmlFor="solution" className="block text-sm font-medium text-dark-slate mb-1">
            How do you propose to solve it?
          </label>
          <p className="text-xs text-dark-slate/50 mb-2">
            Describe your idea. What would be built, who would do it, what&apos;s the mechanism of change?
          </p>
          <textarea
            id="solution" name="solution" rows={5}
            placeholder="e.g. A distributed network of community-run micro-recycling hubs, powered by a mobile app that helps people find their nearest hub, earn credits for recycling, and track their environmental impact..."
            className="w-full border border-muted-teal rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(0)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Back</button>
          <button type="button" onClick={() => setStep(2)} className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
            Next: Impact →
          </button>
        </div>
      </div>

      {/* Step 3: Impact */}
      <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <div>
          <label htmlFor="estimatedReach" className="block text-sm font-medium text-dark-slate mb-1">
            Estimated reach <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-dark-slate/50 mb-2">How many people could this idea positively affect?</p>
          <input
            id="estimatedReach" name="estimatedReach" type="number" min="1"
            placeholder="e.g. 50000"
            className="w-full border border-muted-teal rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-sm font-medium text-dark-slate">UN SDG Goals</label>
              <p className="text-xs text-dark-slate/50">Which sustainable development goals does this address?</p>
            </div>
            {problem.length >= 20 && (
              <button
                type="button"
                onClick={handleSuggest}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs font-medium text-seagrass hover:text-dark-slate transition-colors disabled:opacity-50"
              >
                {isPending ? "Analyzing…" : "✨ Suggest with AI"}
              </button>
            )}
          </div>
          {reasoning && <p className="text-xs text-dark-slate/50 mb-2 italic">{reasoning}</p>}
          <div className="grid grid-cols-2 gap-2">
            {SDG_GOALS.map(({ n, label }) => {
              const isChecked = selected.has(n);
              const isSuggested = aiSuggested.includes(n);
              return (
                <label key={n} className={`flex items-center gap-2 cursor-pointer rounded px-1 py-0.5 ${isSuggested && isChecked ? "bg-seagrass/10" : ""}`}>
                  <input
                    type="checkbox" name="sdgGoals" value={n}
                    checked={isChecked} onChange={() => toggle(n)}
                    className="accent-seagrass w-4 h-4 flex-shrink-0"
                  />
                  <span className={`text-xs ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60"}`}>
                    <span className="font-semibold">{n}.</span> {label}
                  </span>
                  {isSuggested && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-seagrass">AI</span>}
                </label>
              );
            })}
          </div>
        </div>

        {/* Visibility */}
        <div className="p-4 bg-dry-sage/50 rounded-xl">
          <p className="text-sm font-medium text-dark-slate mb-3">Publishing</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio" name="status" value="open"
                checked={publishNow} onChange={() => setPublishNow(true)}
                className="accent-seagrass mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-dark-slate">Publish now</span>
                <p className="text-xs text-dark-slate/50">Share with the community immediately and start collecting votes.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio" name="status" value="draft"
                checked={!publishNow} onChange={() => setPublishNow(false)}
                className="accent-seagrass mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-dark-slate">Save as draft</span>
                <p className="text-xs text-dark-slate/50">Only you can see it. Publish when you&apos;re ready.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Back</button>
          <button
            type="submit"
            disabled={isPending}
            className="px-8 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors disabled:opacity-60"
          >
            {isPending ? "Submitting…" : publishNow ? "Submit idea" : "Save draft"}
          </button>
        </div>
      </div>
    </form>
  );
}
