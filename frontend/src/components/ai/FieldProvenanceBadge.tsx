"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { FieldKnowledgeStatus } from "@prisma/client";
import type { ProvenanceInfo, ProvenanceEntity } from "@/lib/fieldProvenance";
import { setFieldStatus } from "@/lib/actions/fieldProvenance";

/**
 * Small provenance marker for one field: who wrote it (only shown when AI
 * was involved) and whether it's known ("vet") or assumed ("antar"). The
 * vet/antar pill is a toggle for those who may edit the field. Fields with
 * no provenance row are human-written and start as "antar".
 */
export default function FieldProvenanceBadge({
  projectSlug,
  entity,
  field,
  info,
  hasContent,
  canEdit,
}: {
  projectSlug: string;
  entity: ProvenanceEntity;
  field: string;
  info: ProvenanceInfo | undefined;
  hasContent: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("FieldProvenance");
  const [status, setStatus] = useState<FieldKnowledgeStatus>(info?.status ?? "ANTAR");
  const [pending, startTransition] = useTransition();
  if (!hasContent) return null;

  function toggle() {
    const next: FieldKnowledgeStatus = status === "VET" ? "ANTAR" : "VET";
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await setFieldStatus(projectSlug, entity, field, next);
      } catch {
        setStatus(prev);
      }
    });
  }

  const pillClass =
    status === "VET"
      ? "bg-seagrass/15 text-seagrass border-seagrass/40"
      : "bg-amber-50 text-amber-700 border-amber-300";

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {info?.author === "AI" && (
        <span className="rounded-full border border-coral/40 bg-coral/10 px-1.5 py-px text-[10px] font-medium text-coral" title={t("aiDraftHint")}>
          {t("aiDraft")}
        </span>
      )}
      {info?.author === "AI_EDITED" && (
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
