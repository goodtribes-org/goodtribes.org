"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { SynthesisContent } from "@/lib/ideaInsights";
import { setFieldStatus } from "@/lib/actions/fieldProvenance";
import { synthesizeInterviews } from "./actions";

const VERDICT_STYLE: Record<string, string> = {
  confirmed: "border-seagrass/40 bg-seagrass/10 text-seagrass",
  refuted: "border-watermelon/40 bg-watermelon/10 text-watermelon",
  unclear: "border-amber-300 bg-amber-50 text-amber-700",
};

// "Sammanfatta intervjuerna": learnings plus, per assumption the interviews
// speak to, a verdict with the interviews it rests on. A confirmed
// assumption can be marked as known with one click; a refuted one points
// back to its field to be reworked. The human decides — nothing changes
// by itself.
export default function InterviewSynthesisPanel({
  slug,
  interviewCount,
  synthesis,
  stillAssumed,
  fieldLabels,
  personaById,
  canEdit,
  aiAvailable,
}: {
  slug: string;
  interviewCount: number;
  synthesis: SynthesisContent | null;
  // Field keys still marked ANTAR right now (so a verdict already acted on
  // shows as done).
  stillAssumed: string[];
  fieldLabels: Record<string, string>;
  personaById: Record<string, string>;
  canEdit: boolean;
  aiAvailable: boolean;
}) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const assumed = new Set(stillAssumed);

  function synthesize() {
    setError(null);
    startTransition(async () => {
      const res = await synthesizeInterviews(slug);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function markKnown(key: string) {
    const [entity, field] = key.split(".");
    startTransition(async () => {
      try {
        await setFieldStatus(slug, entity, field, "VET");
        setMarked((m) => new Set(m).add(key));
      } catch {
        setError(t("genericError"));
      }
    });
  }

  const anchor = (key: string) =>
    key.startsWith("valueProposition.") ? "#vardeerbjudande" : key.startsWith("impactModel.") ? "#impactmodell" : "#lean-canvas";
  const newSinceSynthesis = synthesis ? interviewCount - synthesis.interviewCount : 0;

  return (
    <div className="mt-4 border-t border-muted-teal/20 pt-4">
      {canEdit && aiAvailable && interviewCount > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={synthesize}
            disabled={pending}
            className="rounded-lg border border-seagrass/60 px-3 py-1.5 text-sm font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
          >
            {pending ? t("synthesizing") : synthesis ? t("synthesizeAgain") : t("synthesize")}
          </button>
          {synthesis && newSinceSynthesis > 0 && <span className="text-xs text-dark-slate/60">{t("newInterviews", { count: newSinceSynthesis })}</span>}
          {!synthesis && interviewCount < 3 && <span className="text-xs text-dark-slate/50">{t("synthesizeFewHint")}</span>}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-watermelon">{error}</p>}

      {synthesis && (
        <div className="mt-4 flex flex-col gap-4">
          {synthesis.learnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-dark-slate">{t("learningsHeading", { count: synthesis.interviewCount })}</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-dark-slate/80">
                {synthesis.learnings.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}
          {synthesis.verdicts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-dark-slate">{t("verdictsHeading")}</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {synthesis.verdicts.map((v) => {
                  const isKnown = marked.has(v.field) || !assumed.has(v.field);
                  return (
                    <li key={v.field} className="rounded-lg border border-muted-teal/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-dark-slate">{fieldLabels[v.field] ?? v.field}</span>
                        <span className={`rounded-full border px-2 py-px text-[11px] font-semibold ${VERDICT_STYLE[v.verdict]}`}>{t(`verdict_${v.verdict}`)}</span>
                      </div>
                      {v.reason && <p className="mt-1 text-dark-slate/75">{v.reason}</p>}
                      {v.interviewIds.length > 0 && (
                        <p className="mt-1 text-xs text-dark-slate/50">
                          {t("basedOn")}: {v.interviewIds.map((id) => personaById[id] ?? "?").join(", ")}
                        </p>
                      )}
                      {canEdit && v.verdict === "confirmed" && (
                        isKnown ? (
                          <p className="mt-2 text-xs font-medium text-seagrass">✓ {t("markedKnown")}</p>
                        ) : (
                          <button type="button" onClick={() => markKnown(v.field)} disabled={pending} className="mt-2 text-xs font-semibold text-seagrass hover:underline disabled:opacity-60">
                            {t("markKnown")}
                          </button>
                        )
                      )}
                      {canEdit && v.verdict === "refuted" && (
                        <a href={anchor(v.field)} className="mt-2 inline-block text-xs font-semibold text-watermelon hover:underline">
                          {t("reviewField")} →
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
