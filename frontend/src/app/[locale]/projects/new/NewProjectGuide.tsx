"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createProject } from "./actions";
import FileUpload from "@/components/FileUpload";
import RichTextEditor from "@/components/RichTextEditor";
import GuideStepIndicator from "@/components/GuideStepIndicator";
import { IDEA_GUIDE_STEPS } from "@/lib/ideaGuideSteps";
import { CATEGORIES } from "@/lib/categories";
import { CREATABLE_LEGAL_TYPES } from "@/lib/legalType";

interface Props {
  initial?: { title?: string; slogan?: string; description?: string; sdgGoals?: number[]; category?: string; tags?: string[]; imageUrl?: string };
  ideaId?: string;
  fromThread?: string;
  contextNote?: string;
}

// Step 1 of the idea-phase guide ("Beskriv projektet"/dream_defined) —
// creates the Project and saves its full description in one submit, so
// there's no separate bare "just a title" page before the guide begins
// (see [slug]/guide/IdeaGuide.tsx for the remaining steps).
export default function NewProjectGuide({ initial = {}, ideaId, fromThread, contextNote }: Props) {
  const t = useTranslations("NewProjectGuide");
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [descriptionError, setDescriptionError] = useState(false);
  const descriptionEmpty = description.replace(/<[^>]*>/g, "").trim().length === 0;

  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-dark-slate mb-2">{t("heading")}</h1>
      <p className="text-sm text-dark-slate/60 mb-8">
        {contextNote ?? t("contextNoteDefault")}
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
            {t("coverImageLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalLabel")}</span>
          </label>
          <FileUpload visibility="public" accept="image/*" onUpload={setImageUrl} />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
            {t("projectNameLabel")} <span className="text-watermelon">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initial.title ?? ""}
            placeholder={t("projectNamePlaceholder")}
            autoFocus
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="slogan" className="block text-sm font-medium text-dark-slate mb-1">
            {t("sloganLabel")} <span className="text-dark-slate/50 font-normal">{t("optionalLabel")}</span>
          </label>
          <input
            id="slogan"
            name="slogan"
            type="text"
            defaultValue={initial.slogan ?? ""}
            placeholder={t("sloganPlaceholder")}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-dark-slate mb-1">
            {t("summaryLabel")} <span className="text-watermelon">*</span> <span className="text-dark-slate/50 font-normal">{t("summaryHelper")}</span>
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={2}
            required
            placeholder={t("summaryPlaceholder")}
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
            {t("descriptionLabel")} <span className="text-watermelon">*</span>
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
            <p className="text-xs text-watermelon mt-1">{t("descriptionRequiredError")}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate mb-2">
            {t("legalTypeLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CREATABLE_LEGAL_TYPES.map((legalType) => (
              <label
                key={legalType.value}
                className="flex items-start gap-2 border border-muted-teal rounded-md px-3 py-2 cursor-pointer hover:border-seagrass/60 transition-colors"
              >
                <input
                  type="radio"
                  name="legalType"
                  value={legalType.value}
                  defaultChecked={legalType.value === "NONPROFIT_UMBRELLA"}
                  className="mt-0.5 accent-seagrass"
                />
                <span className="text-xs text-dark-slate/80">{legalType.label.split(" — ")[0]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-dark-slate mb-1">
              {t("categoryLabel")}
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
              {t("tagsLabel")} <span className="text-dark-slate/50 font-normal">{t("tagsHelper")}</span>
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
            {submitting ? t("submittingButton") : t("nextButton")}
          </button>
        </div>
      </form>
    </div>
  );
}
