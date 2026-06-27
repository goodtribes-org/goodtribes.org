"use client";

import { useState, useTransition, useRef } from "react";
import { updateProject, deleteProject } from "./actions";
import { getSdgSuggestions } from "@/app/projects/new/actions";
import FileUpload from "@/components/FileUpload";

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

const CATEGORIES = ["Technology", "Environment", "Education", "Arts", "Community", "Health", "Other"];
const STATUSES = [
  { value: "concept", label: "Concept" },
  { value: "prototype", label: "Prototype" },
  { value: "production", label: "In Production" },
  { value: "delivery", label: "Delivered" },
];

interface Props {
  slug: string;
  skills: { id: string; name: string; slug: string }[];
  orgs: { id: string; name: string }[];
  currentSkillIds: string[];
  currentOrgId: string | null;
  initial: {
    title: string;
    description: string | null;
    status: string;
    visibility: string;
    category: string | null;
    tags: string[];
    sdgGoals: number[];
    imageUrl: string | null;
  };
}

export default function EditProjectForm({ slug, skills, orgs, currentSkillIds, currentOrgId, initial }: Props) {
  const [description, setDescription] = useState(initial.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(initial.sdgGoals));
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(url: string) {
    if (imageInputRef.current) imageInputRef.current.value = url;
  }

  function toggle(n: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function handleSuggest() {
    startSuggesting(async () => {
      const result = await getSdgSuggestions(description);
      if (result) {
        setAiSuggested(result.goals);
        setReasoning(result.reasoning);
        setSelected(new Set(result.goals));
      }
    });
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateProject(slug, formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      {/* Organisation */}
      {orgs.length > 0 && (
        <div>
          <label htmlFor="orgId" className="block text-sm font-medium text-dark-slate mb-1">
            Organisation <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <select
            id="orgId"
            name="orgId"
            defaultValue={currentOrgId ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">— none —</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          Cover image <span className="text-dark-slate/50 font-normal">(optional)</span>
        </label>
        <FileUpload
          visibility="public"
          accept="image/*"
          currentImageUrl={initial.imageUrl ?? undefined}
          onUpload={handleImageUpload}
        />
        <input type="hidden" name="imageUrl" ref={imageInputRef} defaultValue={initial.imageUrl ?? ""} />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Title <span className="text-watermelon">*</span>
        </label>
        <input
          id="title" name="title" type="text" required
          defaultValue={initial.title}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          Description
        </label>
        <textarea
          id="description" name="description" rows={5}
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
            Category
          </label>
          <select
            id="category" name="category"
            defaultValue={initial.category ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">— none —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-dark-slate mb-1">
            Status
          </label>
          <select
            id="status" name="status"
            defaultValue={initial.status}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-dark-slate mb-1">
          Tags <span className="text-dark-slate/50 font-normal">(comma-separated)</span>
        </label>
        <input
          id="tags" name="tags" type="text"
          defaultValue={initial.tags.join(", ")}
          placeholder="climate, youth, africa"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">Visibility</label>
        <div className="flex gap-4">
          {["public", "private"].map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="visibility" value={v}
                defaultChecked={initial.visibility === v} className="accent-seagrass" />
              <span className="text-sm capitalize">{v}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-slate">
            UN SDG Goals
          </label>
          {description.length >= 20 && (
            <button type="button" onClick={handleSuggest} disabled={isSuggesting}
              className="flex items-center gap-1.5 text-xs font-medium text-seagrass hover:text-dark-slate disabled:opacity-50">
              {isSuggesting ? "Analyzing…" : "✨ Suggest with AI"}
            </button>
          )}
        </div>
        {reasoning && <p className="text-xs text-dark-slate/50 mb-2 italic">{reasoning}</p>}
        <div className="grid grid-cols-2 gap-2">
          {SDG_GOALS.map(({ n, label }) => {
            const isChecked = selected.has(n);
            const isSuggested = aiSuggested.includes(n);
            return (
              <label key={n}
                className={`flex items-center gap-2 cursor-pointer group rounded px-1 py-0.5 ${isSuggested && isChecked ? "bg-seagrass/10" : ""}`}>
                <input type="checkbox" name="sdgGoals" value={n}
                  checked={isChecked} onChange={() => toggle(n)}
                  className="accent-seagrass w-4 h-4 flex-shrink-0" />
                <span className={`text-xs ${isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60"}`}>
                  <span className="font-semibold">{n}.</span> {label}
                </span>
                {isSuggested && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-seagrass">AI</span>}
              </label>
            );
          })}
        </div>
      </div>

      {skills.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Skills needed <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="skillIds"
                  value={s.id}
                  defaultChecked={currentSkillIds.includes(s.id)}
                  className="sr-only peer"
                />
                <span className="inline-block px-3 py-1 rounded-full border border-muted-teal text-sm text-dark-slate/70 transition-all peer-checked:border-seagrass peer-checked:bg-seagrass/10 peer-checked:text-seagrass hover:border-dark-slate/40">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <a href={`/projects/${slug}`}
          className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">
          Cancel
        </a>
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-5 mt-6">
        <p className="text-sm font-medium text-dark-slate mb-1">Delete project</p>
        <p className="text-xs text-dark-slate/50 mb-4">
          Permanently removes the project, all tasks, milestones, and chat history. This cannot be undone.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Are you sure? This will permanently delete the project and all its data.")) return;
            startTransition(() => deleteProject(slug));
          }}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          Delete project
        </button>
      </div>
    </form>
  );
}
