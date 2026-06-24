"use client";

import { createIdea } from "./actions";

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

export default function NewIdeaForm() {
  return (
    <form action={createIdea} className="flex flex-col gap-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Title <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="What's your idea?"
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
          rows={6}
          placeholder="Describe the problem, your proposed solution, and potential impact..."
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          UN SDG Goals <span className="text-dark-slate/50 font-normal">(select all that apply)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SDG_GOALS.map(({ n, label }) => (
            <label key={n} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                name="sdgGoals"
                value={n}
                className="accent-seagrass w-4 h-4 flex-shrink-0"
              />
              <span className="text-xs text-dark-slate/70 group-hover:text-dark-slate transition-colors">
                <span className="font-semibold">{n}.</span> {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors mt-2"
      >
        Post idea
      </button>
    </form>
  );
}
