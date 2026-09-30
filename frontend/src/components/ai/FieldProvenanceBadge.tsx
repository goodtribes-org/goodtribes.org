"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { FieldKnowledgeStatus } from "@prisma/client";
import type { ProvenanceInfo, ProvenanceEntity } from "@/lib/fieldProvenance";
import { approveAiDraft, setFieldStatus } from "@/lib/actions/fieldProvenance";

/**
 * Small provenance marker for one field: who wrote it (only shown when AI
 * was involved) and whether it's known ("vet") or assumed ("antar"). The
 * vet/antar pill is a toggle for those who may edit the field. Fields with
 * no provenance row are human-written and start as "antar". An unreviewed
 * AI draft also gets "Ser bra ut" (approve it without rewriting) and a
 * data-ai-draft marker that AiDraftsNotice uses to find and highlight it.
 */
export default function FieldProvenanceBadge({
  projectSlug,
  entity,
  field,
  info,
  hasContent,
  canEdit,
  onStatusChange,
  showAuthor = true,
}: {
  projectSlug: string;
  entity: ProvenanceEntity;
  field: string;
  info: ProvenanceInfo | undefined;
  hasContent: boolean;
  canEdit: boolean;
  // Lets the surrounding block react to a toggle right away (e.g. its
  // border colour in LeanCanvasBlock).
  onStatusChange?: (status: FieldKnowledgeStatus) => void;
  // false = the canvas blocks: only Vet/Antar is shown. An unreviewed AI
  // draft's "AI-utkast" and "Ser bra ut" stay in the page but hidden
  // (.ai-review-only), appearing only while AiDraftsNotice's "Visa dem" is
  // on; "AI + granskat" isn't shown at all.
  showAuthor?: boolean;
}) {
  const t = useTranslations("FieldProvenance");
  const [status, setStatus] = useState<FieldKnowledgeStatus>(info?.status ?? "ANTAR");
  const [author, setAuthor] = useState(info?.author);
  const [pending, startTransition] = useTransition();
  if (!hasContent) return null;

  function toggle() {
    const next: FieldKnowledgeStatus = status === "VET" ? "ANTAR" : "VET";
    const prev = status;
    setStatus(next);
    onStatusChange?.(next);
    startTransition(async () => {
      try {
        await setFieldStatus(projectSlug, entity, field, next);
      } catch {
        setStatus(prev);
        onStatusChange?.(prev);
      }
    });
  }

  function approve() {
    setAuthor("AI_EDITED");
    startTransition(async () => {
      try {
        await approveAiDraft(projectSlug, entity, field);
      } catch {
        setAuthor("AI");
      }
    });
  }

  const reviewOnly = showAuthor ? "" : "ai-review-only";

  const pillClass =
    status === "VET"
      ? "bg-seagrass/15 text-seagrass border-seagrass/40"
      : "bg-amber-50 text-amber-700 border-amber-300";

  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-ai-draft={author === "AI" ? "" : undefined}>
      {author === "AI" && (
        <span className={`rounded-full border border-coral/40 bg-coral/10 px-1.5 py-px text-[10px] font-medium text-coral ${reviewOnly}`} title={t("aiDraftHint")}>
          {t("aiDraft")}
        </span>
      )}
      {author === "AI" && canEdit && (
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          title={t("approveHint")}
          className={`rounded-full border border-seagrass/40 bg-white px-1.5 py-px text-[10px] font-medium text-seagrass transition-colors hover:bg-seagrass/10 disabled:opacity-50 ${reviewOnly}`}
        >
          ✓ {t("approve")}
        </button>
      )}
      {showAuthor && author === "AI_EDITED" && (
        <span className="rounded-full border border-muted-teal/50 bg-dry-sage/20 px-1.5 py-px text-[10px] font-medium text-dark-slate/60" title={t("aiEditedHint")}>
          {t("aiEdited")}
        </span>
      )}
      {canEdit ? (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={status === "VET"}
          title={status === "VET" ? t("markAssumed") : t("markKnown")}
          className={`rounded-full border px-1.5 py-px text-[10px] font-medium transition-colors disabled:opacity-50 ${pillClass}`}
        >
          {status === "VET" ? t("known") : t("assumed")}
        </button>
      ) : (
        <span className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${pillClass}`}>
          {status === "VET" ? t("known") : t("assumed")}
        </span>
      )}
    </span>
  );
}
