"use client";

import { useState, useTransition, useRef } from "react";
import { updateProject, deleteProject, advanceProjectPhase, toggleSandbox, toggleChecklistItem } from "./actions";
import { getSdgSuggestions } from "@/app/[locale]/projects/new/actions";
import FileUpload from "@/components/FileUpload";
import RichTextEditor from "@/components/RichTextEditor";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_EN } from "@/lib/sdg";
import { PROJECT_PHASE_LABEL, getNextPhase, isValidProjectPhase, INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import { CATEGORIES } from "@/lib/categories";

interface Props {
  slug: string;
  skills: { id: string; name: string; slug: string }[];
  orgs: { id: string; name: string }[];
  currentSkillIds: string[];
  currentOrgId: string | null;
  initial: {
    title: string;
    summary: string | null;
    description: string | null;
    phase: string;
    isSandbox: boolean;
    visibility: string;
    category: string | null;
    tags: string[];
    sdgGoals: number[];
    imageUrl: string | null;
  };
  completedChecklistKeys: string[];
}

export default function EditProjectForm({ slug, skills, orgs, currentSkillIds, currentOrgId, initial, completedChecklistKeys }: Props) {
  const [description, setDescription] = useState(initial.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(new Set(initial.sdgGoals));
  const [aiSuggested, setAiSuggested] = useState<number[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, startSuggesting] = useTransition();
  const [isAdvancing, startAdvancing] = useTransition();
  const [isGraduating, startGraduating] = useTransition();
  const [isTogglingChecklist, startTogglingChecklist] = useTransition();
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedChecklistKeys));
  const imageInputRef = useRef<HTMLInputElement>(null);
  const nextPhase = isValidProjectPhase(initial.phase) ? getNextPhase(initial.phase) : null;
  const checklist = initial.phase === "IDEA" || initial.phase === "SPRINT" ? INITIATIVE_CHECKLIST_ITEMS[initial.phase] : null;

  function handleToggleChecklistItem(itemKey: string, done: boolean) {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
    startTogglingChecklist(() => toggleChecklistItem(slug, initial.phase as "IDEA" | "SPRINT", itemKey, done));
  }

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
        <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
          Summary <span className="text-dark-slate/50 font-normal">(visas på projektkortet)</span>
        </label>
        <textarea
          id="summary" name="summary" rows={2}
          defaultValue={initial.summary ?? ""}
          placeholder="Kort sammanfattning av projektet — 1–2 meningar"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-slate mb-2">
          Description
        </label>
        <input type="hidden" name="description" value={description} />
        <RichTextEditor content={description} onChange={setDescription} />
      </div>

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

      {/* Fas — fasövergångar sker bara framåt, ett steg i taget (PRD 4d) */}
      <div className="border border-muted-teal rounded-md p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-dark-slate">Fas</p>
          <p className="text-sm text-dark-slate/70 mt-0.5">{PROJECT_PHASE_LABEL[initial.phase] ?? initial.phase}</p>
        </div>
        {nextPhase ? (
          <button
            type="button"
            disabled={isAdvancing}
            onClick={() => startAdvancing(() => advanceProjectPhase(slug))}
            className="text-sm font-medium text-seagrass border border-seagrass rounded-md px-4 py-2 hover:bg-seagrass/10 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isAdvancing ? "Avancerar…" : `Avancera till ${PROJECT_PHASE_LABEL[nextPhase]} →`}
          </button>
        ) : (
          <span className="text-xs text-dark-slate/40 flex-shrink-0">Sista fasen uppnådd</span>
        )}
      </div>

      {initial.isSandbox && (
        <div className="border-2 border-amber-300 bg-amber-50/40 rounded-md p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-dark-slate">🧪 Sandbox-projekt</p>
            <p className="text-xs text-dark-slate/60 mt-0.5">Redo att lämna Sandbox? Det finns inget separat "lyft"-steg — det här är redan ett riktigt projekt.</p>
          </div>
          <button
            type="button"
            disabled={isGraduating}
            onClick={() => startGraduating(() => toggleSandbox(slug))}
            className="text-sm font-medium text-amber-700 border border-amber-400 rounded-md px-4 py-2 hover:bg-amber-100 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {isGraduating ? "Sparar…" : "Gör till ett riktigt projekt"}
          </button>
        </div>
      )}

      {checklist && (
        <div className="border border-muted-teal rounded-md p-4">
          <p className="text-sm font-medium text-dark-slate mb-3">Checklista — {PROJECT_PHASE_LABEL[initial.phase]}</p>
          <div className="flex flex-col gap-2">
            {checklist.map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doneKeys.has(item.key)}
                  disabled={isTogglingChecklist}
                  onChange={(e) => handleToggleChecklistItem(item.key, e.target.checked)}
                  className="accent-seagrass w-4 h-4"
                />
                <span className="text-sm text-dark-slate/80">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
          {SDG_NUMBERS.map((n) => {
            const label = SDG_LABELS_EN[n];
            const isChecked = selected.has(n);
            const isSuggested = aiSuggested.includes(n);
            return (
              <label key={n}
                className={`flex items-center gap-2 cursor-pointer group rounded px-1 py-0.5 ${isSuggested && isChecked ? "bg-seagrass/10" : ""}`}>
                <input type="checkbox" name="sdgGoals" value={n}
                  checked={isChecked} onChange={() => toggle(n)}
                  className="accent-seagrass w-4 h-4 flex-shrink-0" />
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
