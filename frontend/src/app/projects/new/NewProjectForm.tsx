"use client";

import { useState, useTransition, useRef } from "react";
import { createProject, getSdgSuggestions } from "./actions";
import FileUpload from "@/components/FileUpload";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_EN } from "@/lib/sdg";

const CATEGORIES = ["Technology", "Environment", "Education", "Arts", "Community", "Health", "Other"];

interface Props {
  initial?: { title?: string; description?: string; sdgGoals?: number[]; category?: string; tags?: string[]; imageUrl?: string };
  ideaId?: string;
  skills: { id: string; name: string; slug: string }[];
  orgs: { id: string; name: string }[];
}

export default function NewProjectForm({ initial = {}, ideaId, skills, orgs }: Props) {
  const [description, setDescription] = useState(initial.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(initial.sdgGoals ?? []));
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();
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
      {ideaId && <input type="hidden" name="ideaId" value={ideaId} />}

      {/* Project image */}
      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          Cover image <span className="text-dark-slate/50 font-normal">(optional)</span>
        </label>
        <FileUpload
          visibility="public"
          accept="image/*"
          onUpload={handleImageUpload}
        />
        <input type="hidden" name="imageUrl" ref={imageInputRef} defaultValue={initial.imageUrl ?? ""} />
      </div>

      {orgs.length > 0 && (
        <div>
          <label htmlFor="orgId" className="block text-sm font-medium text-dark-slate mb-1">
            Organisation <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <select
            id="orgId"
            name="orgId"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
          >
            <option value="">— none —</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Title <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial.title ?? ""}
          placeholder="Project name"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
            Category
          </label>
          <select id="category" name="category" defaultValue={initial.category ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white">
            <option value="">— none —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-dark-slate mb-1">
            Tags <span className="text-dark-slate/50 font-normal">(comma-separated)</span>
          </label>
          <input id="tags" name="tags" type="text" placeholder="climate, youth"
            defaultValue={initial.tags?.join(", ") ?? ""}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral" />
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
          Summary <span className="text-dark-slate/50 font-normal">(visas på projektkortet)</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          placeholder="Kort sammanfattning — 1–2 meningar"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
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
          {SDG_NUMBERS.map((n) => {
            const label = SDG_LABELS_EN[n];
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
                <SdgIcon n={n} size={20} />
                <span
                  className={`text-xs transition-colors ${
                    isChecked ? "text-dark-slate font-medium" : "text-dark-slate/60 group-hover:text-dark-slate"
                  }`}
                >
                  {label}
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

      {skills.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Skills needed <span className="text-dark-slate/50 font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input type="checkbox" name="skillIds" value={s.id} className="sr-only peer" />
                <span className="inline-block px-3 py-1 rounded-full border border-muted-teal text-sm text-dark-slate/70 transition-all peer-checked:border-seagrass peer-checked:bg-seagrass/10 peer-checked:text-seagrass hover:border-dark-slate/40">
                  {s.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

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
