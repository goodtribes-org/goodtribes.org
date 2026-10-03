"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { updateIdeaDetails } from "../../guide/actions";
import ProjectCoverImage, { TextLengthMeter } from "./ProjectCoverImage";
import { newHomeDisplayFont } from "@/components/ny-startsida/fonts";

type About = { title: string; summary: string; description: string; descriptionHtml: string; category: string; tags: string[]; imageUrl: string | null };

// "Om projektet" on the Idé overview — the project's shop window for
// volunteers and sponsors: cover image, title, summary and description laid
// out like the public page, with vet/antar per field. For the team, a gauge
// under summary and description says whether the length is right, and one
// Edit button switches the text to a form.
export default function AboutSection({
  slug,
  about,
  provenance,
  canEdit,
}: {
  slug: string;
  about: About;
  provenance: Record<string, ProvenanceInfo>;
  canEdit: boolean;
}) {
  const t = useTranslations("IdeaOverview");
  const tCat = useTranslations("Categories");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(about);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!form.title.trim()) {
      setError(true);
      return;
    }
    startTransition(async () => {
      await updateIdeaDetails(slug, {
        title: form.title,
        summary: form.summary,
        description: form.description,
        category: form.category,
        tags: form.tags,
        imageUrl: "",
      });
      setEditing(false);
      router.refresh();
    });
  }

  const badge = (field: string, value: string | string[]) => (
    <FieldProvenanceBadge
      projectSlug={slug}
      entity="project"
      field={field}
      info={provenance[field]}
      hasContent={Array.isArray(value) ? value.length > 0 : !!value.trim()}
      canEdit={canEdit}
    />
  );

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <label className="block text-sm font-medium text-dark-slate">
          {t("fieldTitle")}
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-md border border-muted-teal px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </label>
        <label className="block text-sm font-medium text-dark-slate">
          {t("fieldSummary")}
          <textarea
            value={form.summary}
            rows={2}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="mt-1 w-full rounded-md border border-muted-teal px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <span className="mt-1 block font-normal"><TextLengthMeter kind="summary" value={form.summary} /></span>
        </label>
        <div>
          <p className="mb-1 text-sm font-medium text-dark-slate">{t("fieldDescription")}</p>
          <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} />
          <div className="mt-1"><TextLengthMeter kind="description" value={form.description} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-dark-slate">
            {t("fieldCategory")}
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-md border border-muted-teal px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCat(CATEGORY_KEYS[c])}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-dark-slate">
            {t("fieldTags")}
            <input
              value={form.tags.join(", ")}
              onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="mt-1 w-full rounded-md border border-muted-teal px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && <p className="text-sm text-watermelon">{t("titleRequired")}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60">
            {pending ? t("saving") : t("save")}
          </button>
          <button type="button" onClick={() => { setForm(about); setEditing(false); }} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ProjectCoverImage slug={slug} imageUrl={about.imageUrl} title={about.title} canEdit={canEdit} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`${newHomeDisplayFont.className} text-2xl font-bold tracking-[-0.01em] text-dark-slate sm:text-3xl`}>{about.title}</p>
          {badge("title", about.title)}
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} className="ml-auto rounded-full border border-dark-slate/15 px-3 py-1 text-sm font-medium text-dark-slate/60 hover:border-coral hover:text-coral">
              {t("editText")}
            </button>
          )}
        </div>
        {about.summary ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg leading-snug text-dark-slate/80">{about.summary}</p>
            {badge("summary", about.summary)}
          </div>
        ) : (
          canEdit && <p className="mt-2 text-sm text-[#B5524C]">{t("summaryMissing")}</p>
        )}
        {canEdit && <div className="mt-2"><TextLengthMeter kind="summary" value={about.summary} /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-dark-slate/60">
        {/* Category and tags are AI guesses after a Drömsamtal too (written
            in AGENT mode, see createProjectFromDream): marked like the rest. */}
        {about.category && <span className="rounded-full bg-dry-sage/30 px-2.5 py-1">{tCat(CATEGORY_KEYS[about.category] ?? "categoryOther")}</span>}
        {about.category && badge("category", about.category)}
        {about.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-muted-teal/40 px-2.5 py-1">
            {tag}
          </span>
        ))}
        {about.tags.length > 0 && badge("tags", about.tags)}
      </div>
      {about.descriptionHtml ? (
        <div className="border-t border-dark-slate/10 pt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {badge("description", about.description)}
            {canEdit && <TextLengthMeter kind="description" value={about.description} />}
          </div>
          {/* Sanitized server-side (sanitizeHtml) before being passed in. */}
          <div className="prose max-w-none text-[15px] leading-relaxed text-dark-slate/85" dangerouslySetInnerHTML={{ __html: about.descriptionHtml }} />
        </div>
      ) : (
        canEdit && <p className="border-t border-dark-slate/10 pt-5 text-sm text-[#B5524C]">{t("descriptionMissing")}</p>
      )}
    </div>
  );
}
