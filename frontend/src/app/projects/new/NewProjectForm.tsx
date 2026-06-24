"use client";

import { useState, useTransition } from "react";
import { createProject, getSdgSuggestions } from "./actions";

const SDG_GOALS = [
  { n: 1, label: "No Poverty" },
  { n: 2, label: "Zero Hunger" },
  { n: 3, label: "Good Health" },
  { n: 4, label: "Quality Education" },
  { n: 5, label: "Gender Equality" },
  { n: 6, label: "Clean Water" },
  { n: 7, label: "Clean Energy" },
  { n: 8, label: "Decent Work" },
  { n: 9, label: "Industry & Innovation" },
  { n: 10, label: "Reduced Inequalities" },
  { n: 11, label: "Sustainable Cities" },
  { n: 12, label: "Responsible Consumption" },
  { n: 13, label: "Climate Action" },
  { n: 14, label: "Life Below Water" },
  { n: 15, label: "Life on Land" },
  { n: 16, label: "Peace & Justice" },
  { n: 17, label: "Partnerships" },
];

export default function NewProjectForm() {
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  function handleSuggest() {
    startTransition(async () => {
      const result = await getSdgSuggestions(description);
      if (result) {
        setAiSuggested(result.goals);
        setReasoning(result.reasoning);
        setSelected(new Set(result.goals));
      }
    });
  }

  return (
    <form action={createProject} className="flex flex-col gap-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Title <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Project name"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about? What problem does it solve?"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-slate">
            UN SDG Goals{" "}
            <span className="text-dark-slate/50 font-normal">(select all that apply)</span>
          </label>
          {description.length >= 20 && (
            <button
              type="button"
              onClick={handleSuggest}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-medium text-seagrass hover:text-dark-slate transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>✨ Suggest with AI</>
              )}
            </button>
          )}
        </div>

        {reasoning && (
          <p className="text-xs text-dark-slate/50 mb-2 italic">{reasoning}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {SDG_GOALS.map(({ n, label }) => {
            const isChecked = selected.has(n);
            const isSuggested = aiSuggested.includes(n);
            return (
              <label
                key={n}
                className={`flex items-center gap-2 cursor-pointer group rounded px-1 py-0.5 transition-colors ${
                  isSuggested && isChecked ? "bg-seagrass/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="sdgGoals"
                  value={n}
                  checked={isChecked}
                  onChange={() => toggle(n)}
                  className="accent-seagrass w-4 h-4 flex-shrink-0"
                />
                <span
                  className={`text-xs transition-colors ${
                    isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60 group-hover:text-dark-slate"
                  }`}
                >
                  <span className="font-semibold">{n}.</span> {label}
                </span>
                {isSuggested && (
                  <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-seagrass">
                    AI
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">Visibility</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="visibility" value="public" defaultChecked className="accent-seagrass" />
            <span className="text-sm text-dark-slate">Public</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="visibility" value="private" className="accent-seagrass" />
            <span className="text-sm text-dark-slate">Private</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
      >
        Create project
      </button>
    </form>
  );
}
