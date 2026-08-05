"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LeanCanvas } from "@prisma/client";
import { completeIdeaGuideStep, updateIdeaDetails } from "./actions";
import { toggleChecklistItem } from "../(workspace)/edit/actions";
import AddOrInviteMember from "../AddOrInviteMember";
import LeanCanvasGrid from "../(workspace)/lean-canvas/LeanCanvasGrid";
import { LEAN_CANVAS_FIELDS } from "../(workspace)/lean-canvas/fields";
import FileUpload from "@/components/FileUpload";
import RichTextEditor from "@/components/RichTextEditor";
import GuideStepIndicator from "@/components/GuideStepIndicator";
import { SdgIcon } from "@/components/SdgIcon";
import { SDG_NUMBERS, SDG_LABELS_SV } from "@/lib/sdg";
import { IDEA_GUIDE_STEPS } from "@/lib/ideaGuideSteps";
import { CATEGORIES } from "@/lib/categories";
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
  initialSummary: string;
  initialDescription: string;
  initialCategory: string;
  initialTags: string[];
  initialImageUrl: string;
  initialSdgGoals: number[];
  completedKeys: string[];
  leanCanvas: LeanCanvas | null;
  hasInvitedSomeone: boolean;
}

// The full idea-phase guide, all 5 steps navigable in either direction —
// step 1 ("Beskriv projektet") both creates the Project on /projects/new
// and can be revisited/edited here afterward via updateIdeaDetails.
export default function IdeaGuide({
  projectId,
  slug,
  title: initialTitle,
  initialSummary,
  initialDescription,
  initialCategory,
  initialTags,
  initialImageUrl,
  initialSdgGoals,
  completedKeys,
  leanCanvas,
  hasInvitedSomeone,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set(completedKeys));
  const [invitedSomeone, setInvitedSomeone] = useState(hasInvitedSomeone);
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [description, setDescription] = useState(initialDescription);
  const [descriptionError, setDescriptionError] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
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

  function handleDetailsNext() {
    const plainDescription = description.replace(/<[^>]*>/g, "").trim();
    if (!title.trim() || !summary.trim() || !plainDescription) {
      setDescriptionError(true);
      return;
    }
    startTransition(async () => {
      await updateIdeaDetails(slug, {
        title,
        summary,
        description,
        category,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        imageUrl,
      });
      setDone((prev) => new Set(prev).add("dream_defined"));
      setStep(1);
    });
  }

  // Advancing never blocks on these — only the checkmark reflects whether
  // the step actually has something behind it.
  function markDone(itemKey: string, isDone: boolean) {
    setDone((prev) => {
      const next = new Set(prev);
      if (isDone) next.add(itemKey); else next.delete(itemKey);
      return next;
    });
  }

  function handleSdgNext() {
    const hasSelection = selected.size > 0;
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "ai_reviewed", hasSelection, Array.from(selected));
      markDone("ai_reviewed", hasSelection);
      setStep(2);
    });
  }

  function handleLeanCanvasNext() {
    const hasContent = LEAN_CANVAS_FIELDS.some((f) => leanCanvas?.[f]?.trim());
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "lean_canvas_created", hasContent);
      markDone("lean_canvas_created", hasContent);
      setStep(3);
    });
  }

  function handleFeedbackNext() {
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "peer_feedback_requested", invitedSomeone);
      markDone("peer_feedback_requested", invitedSomeone);
      setStep(4);
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
    const hasProgress = SPRINT_PREP_ITEMS.some((item) => done.has(item.key));
    startTransition(async () => {
      await completeIdeaGuideStep(slug, "sprint_prepped", hasProgress);
      router.push(`/projects/${slug}`);
    });
  }

  return (
    <div className="py-10">
      <div className="max-w-3xl mx-auto">
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

        {/* Step indicator — every step is freely clickable once done, including
            back to step 1, since it's just as much a local step here as any
            other (its save goes through updateIdeaDetails). */}
        <GuideStepIndicator
          steps={IDEA_GUIDE_STEPS}
          currentIndex={step}
          doneKeys={done}
          onStepClick={(i) => setStep(i)}
        />
      </div>

      {/* Step 1 — Beskriv projektet */}
      <div className={step === 0 ? "flex flex-col gap-5 max-w-3xl mx-auto" : "hidden"}>
        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Omslagsbild <span className="text-dark-slate/50 font-normal">(valfritt)</span>
          </label>
          <FileUpload visibility="public" accept="image/*" onUpload={setImageUrl} />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
            Projektnamn <span className="text-watermelon">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Projektnamn"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
            Kort sammanfattning <span className="text-watermelon">*</span> <span className="text-dark-slate/50 font-normal">(visas på projektkortet)</span>
          </label>
          <textarea
            id="summary"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="1–2 meningar"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            Beskrivning <span className="text-watermelon">*</span>
          </label>
          <RichTextEditor
            content={description}
            onChange={(html) => {
              setDescription(html);
              if (descriptionError) setDescriptionError(false);
            }}
          />
          {descriptionError && (
            <p className="text-xs text-watermelon mt-1">Projektnamn, sammanfattning och beskrivning krävs.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
              Kategori
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral bg-white"
            >
              <option value="">— none —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-dark-slate mb-1">
              Taggar <span className="text-dark-slate/50 font-normal">(kommaseparerat)</span>
            </label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="climate, youth"
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleDetailsNext}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isPending ? "Sparar…" : "Nästa →"}
          </button>
        </div>
      </div>

      {/* Step 2 — Välj SDG */}
      <div className={step === 1 ? "flex flex-col gap-5 max-w-3xl mx-auto" : "hidden"}>
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
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(0)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
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

      {/* Step 3 — Lean Canvas (kept full-width, unlike the other steps, so
          its 10-column grid has room at the 900px+ breakpoint) */}
      <div className={step === 2 ? "flex flex-col gap-5" : "hidden"}>
        <div className="max-w-3xl">
          <label className="block text-sm font-medium text-dark-slate mb-1">Lean Canvas</label>
          <p className="text-xs text-dark-slate/50 mb-3">
            Ett enkelsidigt planeringsverktyg — problem, lösning, målgrupp, kanaler, intäkter.
          </p>
        </div>
        <LeanCanvasGrid projectSlug={slug} canvas={leanCanvas} canEdit />
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
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
      <div className={step === 3 ? "flex flex-col gap-5 max-w-3xl mx-auto" : "hidden"}>
        <div className="rounded-xl border border-seagrass/20 bg-seagrass/5 p-5">
          <label className="block text-base font-semibold text-dark-slate mb-1">
            🎉 Dela idén med vänner
          </label>
          <p className="text-sm text-dark-slate/60 mb-4">
            Bra idéer blir ännu bättre med fler perspektiv. Bjud in vänner och kollegor att kika på din idé och tycka till — både de som redan är med på GoodTribes och de som inte är det än. Helt valfritt, men det tar bara en minut.
          </p>
          <AddOrInviteMember
            projectId={projectId}
            slug={slug}
            onAdded={() => setInvitedSomeone(true)}
            onInviteSent={() => setInvitedSomeone(true)}
          />
        </div>
        <div className="flex justify-between pt-2">
          <button type="button" onClick={() => setStep(2)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
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
      <div className={step === 4 ? "flex flex-col gap-5 max-w-3xl mx-auto" : "hidden"}>
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
          <button type="button" onClick={() => setStep(3)} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">← Tillbaka</button>
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
