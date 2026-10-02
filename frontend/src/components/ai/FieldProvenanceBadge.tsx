"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { FieldAuthor, FieldKnowledgeStatus } from "@prisma/client";
import type { ProvenanceInfo, ProvenanceEntity } from "@/lib/fieldProvenance";
import { approveAiDraft, confirmAiGuess, setFieldStatus } from "@/lib/actions/fieldProvenance";

/**
 * One label per field, saying who stands behind the text:
 * - "Du sa det" — known (vet): it came from the person, or they confirmed it.
 * - "AI:n gissar" — an AI draft nobody in the team has answered yet.
 * - "Antagande" — an assumption the team holds (written by a person, or an
 *   AI draft they kept as something to test).
 * It replaces the earlier three markers (AI-utkast, Ser bra ut, Vet/Antar).
 * For those who may edit: an AI guess opens two answers — Stämmer (known
 * and reviewed) or Vet inte, testa (reviewed, still an assumption); any other
 * label toggles between known and assumption, as before. Fields with no
 * provenance row are human-written and start as an assumption.
 */
export default function FieldProvenanceBadge({
  projectSlug,
  entity,
  field,
  info,
  hasContent,
  canEdit,
  onStatusChange,
}: {
  projectSlug: string;
  entity: ProvenanceEntity;
  field: string;
  info: ProvenanceInfo | undefined;
  hasContent: boolean;
  canEdit: boolean;
  // Lets the surrounding block react to a change right away (e.g. its
  // border colour in LeanCanvasBlock).
  onStatusChange?: (status: FieldKnowledgeStatus) => void;
}) {
  const t = useTranslations("FieldProvenance");
  const [status, setStatus] = useState<FieldKnowledgeStatus>(info?.status ?? "ANTAR");
  const [author, setAuthor] = useState<FieldAuthor | undefined>(info?.author);
  const [answering, setAnswering] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!hasContent) return null;

  const isGuess = author === "AI" && status !== "VET";

  function run(next: { status: FieldKnowledgeStatus; author: FieldAuthor | undefined }, action: () => Promise<void>) {
    const prev = { status, author };
    setStatus(next.status);
    setAuthor(next.author);
    setAnswering(false);
    if (next.status !== prev.status) onStatusChange?.(next.status);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setStatus(prev.status);
        setAuthor(prev.author);
        if (next.status !== prev.status) onStatusChange?.(prev.status);
      }
    });
  }

  const toggle = () => {
    const next: FieldKnowledgeStatus = status === "VET" ? "ANTAR" : "VET";
    run({ status: next, author }, () => setFieldStatus(projectSlug, entity, field, next));
  };
  const confirm = () => run({ status: "VET", author: "AI_EDITED" }, () => confirmAiGuess(projectSlug, entity, field));
  const keep = () => run({ status: "ANTAR", author: "AI_EDITED" }, () => approveAiDraft(projectSlug, entity, field));

  const label = status === "VET" ? t("known") : isGuess ? t("aiGuess") : t("assumed");
  const hint = status === "VET" ? t("knownHint") : isGuess ? t("aiGuessHint") : t("assumedHint");
  const pillClass =
    status === "VET"
      ? "bg-seagrass/15 text-seagrass border-seagrass/40"
      : isGuess
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-amber-50 text-amber-700 border-amber-300";
  const pill = `rounded-full border px-1.5 py-px text-[10px] font-medium ${pillClass}`;

  if (!canEdit) return <span className={pill} title={hint}>{label}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={isGuess ? () => setAnswering((a) => !a) : toggle}
        disabled={pending}
        aria-expanded={isGuess ? answering : undefined}
        aria-pressed={isGuess ? undefined : status === "VET"}
        title={isGuess ? hint : status === "VET" ? t("markAssumed") : t("markKnown")}
        className={`${pill} transition-colors disabled:opacity-50`}
      >
        {label}
        {isGuess && <span aria-hidden> ▾</span>}
      </button>
      {isGuess && answering && (
        <>
          <button
            type="button"
            onClick={confirm}
            title={t("confirmHint")}
            className="rounded-full bg-seagrass px-1.5 py-px text-[10px] font-semibold text-white hover:opacity-90"
          >
            {t("confirm")}
          </button>
          <button
            type="button"
            onClick={keep}
            title={t("keepHint")}
            className="rounded-full border border-muted-teal/60 bg-white px-1.5 py-px text-[10px] font-medium text-dark-slate/70 hover:bg-dry-sage/20"
          >
            {t("keep")}
          </button>
        </>
      )}
    </span>
  );
}
