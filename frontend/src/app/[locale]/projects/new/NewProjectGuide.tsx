"use client";

import { useState } from "react";
import { createProject } from "./actions";
import FileUpload from "@/components/FileUpload";
import RichTextEditor from "@/components/RichTextEditor";
import GuideStepIndicator from "@/components/GuideStepIndicator";
import { IDEA_GUIDE_STEPS } from "@/lib/ideaGuideSteps";
import { CATEGORIES } from "@/lib/categories";
import { CREATABLE_LEGAL_TYPES } from "@/lib/legalType";

interface Props {
  initial?: { title?: string; description?: string; sdgGoals?: number[]; category?: string; tags?: string[]; imageUrl?: string };
  ideaId?: string;
  fromThread?: string;
  contextNote?: string;
}

// Step 1 of the idea-phase guide ("Beskriv projektet"/dream_defined) —
// creates the Project and saves its full description in one submit, so
// there's no separate bare "just a title" page before the guide begins
// (see [slug]/guide/IdeaGuide.tsx for the remaining steps).
export default function NewProjectGuide({ initial = {}, ideaId, fromThread, contextNote }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [descriptionError, setDescriptionError] = useState(false);
  const descriptionEmpty = description.replace(/<[^>]*>/g, "").trim().length === 0;

  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-dark-slate mb-2">Snabbstart — Nytt projekt</h1>
      <p className="text-sm text-dark-slate/60 mb-8">
        {contextNote ?? "En valfri genomgång av idé-fasens delsteg. Hoppa över när som helst — inget här krävs."}
      </p>

      <GuideStepIndicator steps={IDEA_GUIDE_STEPS} currentIndex={0} doneKeys={new Set()} />

      <form
        action={createProject}
        onSubmit={(e) => {
          if (descriptionEmpty) {
            e.preventDefault();
            setDescriptionError(true);
            return;
          }
          setSubmitting(true);
        }}
        className="flex flex-col gap-5"
      >
        {ideaId && <input type="hidden" name="ideaId" value={ideaId} />}
        {fromThread && <input type="hidden" name="fromThread" value={fromThread} />}
        {(initial.sdgGoals ?? []).map((n) => (
          <input key={n} type="hidden" name="sdgGoals" value={n} />
        ))}
        <input type="hidden" name="imageUrl" value={imageUrl} />

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
            name="title"
            type="text"
            required
            defaultValue={initial.title ?? ""}
            placeholder="Projektnamn"
            autoFocus
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
            Kort sammanfattning <span className="text-watermelon">*</span> <span className="text-dark-slate/50 font-normal">(visas på projektkortet)</span>
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={2}
            required
            placeholder="1–2 meningar"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            Beskrivning <span className="text-watermelon">*</span>
          </label>
          <input type="hidden" name="description" value={description} />
          <RichTextEditor
            content={description}
            onChange={(html) => {
              setDescription(html);
              if (descriptionError) setDescriptionError(false);
            }}
          />
          {descriptionError && (
            <p className="text-xs text-watermelon mt-1">Beskrivning krävs.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            Verksamhetstyp
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CREATABLE_LEGAL_TYPES.map((t) => (
              <label
                key={t.value}
                className="flex items-start gap-2 border border-muted-teal rounded-md px-3 py-2 cursor-pointer hover:border-seagrass/60 transition-colors"
              >
                <input
                  type="radio"
                  name="legalType"
                  value={t.value}
                  defaultChecked={t.value === "NONPROFIT_UMBRELLA"}
                  className="mt-0.5 accent-seagrass"
                />
                <span className="text-xs text-dark-slate/80">{t.label.split(" — ")[0]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
              Kategori
            </label>
            <select
              id="category"
              name="category"
              defaultValue={initial.category ?? ""}
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
              name="tags"
              type="text"
              placeholder="climate, youth"
              defaultValue={initial.tags?.join(", ") ?? ""}
              className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-dark-slate text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? "Skapar…" : "Nästa →"}
          </button>
        </div>
      </form>
    </div>
  );
}
