"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { updateIdeaDetails } from "../../guide/actions";

type About = { title: string; summary: string; description: string; descriptionHtml: string; category: string; tags: string[] };

// "Om projektet" on the Idé overview: read view by default (with vet/antar
// per field), one Edit button switches the whole section to a form.
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
        </label>
        <div>
          <p className="mb-1 text-sm font-medium text-dark-slate">{t("fieldDescription")}</p>
          <RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} />
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
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-semibold text-dark-slate">{about.title}</p>
          {badge("title", about.title)}
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} className="ml-auto text-sm font-medium text-dark-slate/50 hover:text-coral">
              {t("edit")}
            </button>
          )}
        </div>
        {about.summary && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-dark-slate/70">{about.summary}</p>
            {badge("summary", about.summary)}
          </div>
        )}
      </div>
      {about.descriptionHtml && (
        <div>
          <div className="mb-1">{badge("description", about.description)}</div>
          {/* Sanitized server-side (sanitizeHtml) before being passed in. */}
          <div className="prose prose-sm max-w-none text-dark-slate/80" dangerouslySetInnerHTML={{ __html: about.descriptionHtml }} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-dark-slate/60">
        {about.category && <span className="rounded-full bg-dry-sage/30 px-2 py-0.5">{tCat(CATEGORY_KEYS[about.category] ?? "categoryOther")}</span>}
        {about.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-muted-teal/40 px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
