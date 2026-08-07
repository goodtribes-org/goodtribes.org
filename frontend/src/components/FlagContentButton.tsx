"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Reason = "SPAM" | "HARASSMENT" | "OFFENSIVE" | "OFF_TOPIC" | "FRAUD" | "ETHICS_VIOLATION" | "OTHER";

export type FlagContentTargetType =
  | "FeedPost"
  | "FeedComment"
  | "IdeaComment"
  | "Message"
  | "DreamWallPost"
  | "KanbanCardComment"
  | "LeanCanvasComment"
  | "Project"
  | "Organisation"
  | "WikiPage"
  | "AcademyGuide"
  | "User"
  | "Idea";

export default function FlagContentButton({
  targetType,
  targetId,
  label,
}: {
  targetType: FlagContentTargetType;
  targetId: string;
  label?: string;
}) {
  const t = useTranslations("FlagContent");

  const REASONS: { value: Reason; label: string }[] = [
    { value: "OFFENSIVE", label: t("reasonOffensive") },
    { value: "HARASSMENT", label: t("reasonHarassment") },
    { value: "SPAM", label: t("reasonSpam") },
    { value: "OFF_TOPIC", label: t("reasonOffTopic") },
    { value: "FRAUD", label: t("reasonFraud") },
    { value: "ETHICS_VIOLATION", label: t("reasonEthics") },
    { value: "OTHER", label: t("reasonOther") },
  ];

  const DEFAULT_LABELS: Partial<Record<FlagContentTargetType, string>> = {
    Project: t("flagProject"),
    Organisation: t("flagOrganisation"),
    WikiPage: t("flagWikiPage"),
    AcademyGuide: t("flagAcademyGuide"),
    User: t("flagUser"),
    Idea: t("flagIdea"),
  };

  const buttonLabel = label ?? DEFAULT_LABELS[targetType] ?? t("flagDefault");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("OFFENSIVE");
  const [motivering, setMotivering] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (motivering.trim().length < 20) {
      setError(t("motivationTooShort"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/content-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, note: motivering.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("somethingWentWrong"));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-dark-slate/40 hover:text-coral transition-colors flex items-center gap-1"
        title={t("flagTooltip")}
      >
        <span aria-hidden>⚑</span> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="mt-2 border border-muted-teal/40 rounded-lg p-4 bg-white max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark-slate">{buttonLabel}</h3>
        <button
          onClick={() => { setOpen(false); setDone(false); setError(null); setMotivering(""); }}
          className="text-dark-slate/40 hover:text-dark-slate text-lg leading-none"
          aria-label={t("close")}
        >
          ×
        </button>
      </div>

      {done ? (
        <p className="text-sm text-seagrass font-medium">
          {t("thanksReported")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset>
            <legend className="text-xs font-medium text-dark-slate/70 mb-2">{t("reasonLegend")}</legend>
            <div className="flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-coral"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="block text-xs font-medium text-dark-slate/70 mb-1">
              {t("motivationLabel")} <span className="text-dark-slate/40">{t("motivationMinChars")}</span>
            </label>
            <textarea
              value={motivering}
              onChange={(e) => setMotivering(e.target.value)}
              rows={3}
              placeholder={t("motivationPlaceholder")}
              className="w-full border border-muted-teal/50 rounded px-3 py-2 text-sm focus:outline-none focus:border-coral resize-none"
              required
              minLength={20}
            />
            <p className="text-xs text-dark-slate/40 mt-0.5 text-right">{t("charCount", { count: motivering.length })}</p>
          </div>

          {error && (
            <p className="text-xs text-coral">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-coral text-white text-xs font-semibold hover:bg-watermelon transition-colors disabled:opacity-50"
            >
              {submitting ? t("sending") : t("sendReport")}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); setMotivering(""); }}
              className="px-4 py-2 rounded border border-muted-teal/50 text-xs text-dark-slate/60 hover:text-dark-slate transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
