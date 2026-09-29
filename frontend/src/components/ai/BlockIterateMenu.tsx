"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { iterateCanvasBlock, type BlockIterationResult } from "@/lib/actions/blockIteration";

// Whether "Förbättra" is offered on a canvas page: set once by the page
// (AI configured, the step's mode isn't MANUAL, the viewer may edit) so the
// blocks don't each need another prop threaded through every grid.
const CanvasIterateContext = createContext(false);

export function CanvasIterateProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <CanvasIterateContext.Provider value={enabled}>{children}</CanvasIterateContext.Provider>;
}

type Mode = "sharpen" | "simplify" | "challenge" | "ask";

type View =
  | { kind: "closed" }
  | { kind: "menu" }
  | { kind: "questions"; questions: string[]; answers: string[] }
  | { kind: "challenges"; questions: string[] }
  | { kind: "done"; note: string | null }
  | { kind: "error"; message: string };

/**
 * "Förbättra" on one canvas block: the AI and the initiativtagare iterate on
 * a single field. Skärp/Förenkla/Fråga mig end as a normal AI suggestion
 * next to the field (Använd / Använd delar / Ignorera); Utmana mig only
 * asks questions. Nothing is written into the field from here.
 */
export default function BlockIterateMenu({
  projectSlug,
  entity,
  field,
  hasContent,
}: {
  projectSlug: string;
  entity: "leanCanvas" | "valueProposition" | "impactModel";
  field: string;
  hasContent: boolean;
}) {
  const enabled = useContext(CanvasIterateContext);
  const t = useTranslations("BlockIterate");
  const [view, setView] = useState<View>({ kind: "closed" });
  const [pending, startTransition] = useTransition();
  if (!enabled) return null;

  function run(mode: Mode | "fromAnswers", answers?: { question: string; answer: string }[]) {
    startTransition(async () => {
      let res: BlockIterationResult;
      try {
        res = await iterateCanvasBlock(projectSlug, entity, field, mode, answers);
      } catch {
        res = { error: t("failed") };
      }
      if ("error" in res) setView({ kind: "error", message: res.error });
      else if (res.kind === "questions") setView({ kind: "questions", questions: res.questions, answers: res.questions.map(() => "") });
      else if (res.kind === "challenges") setView({ kind: "challenges", questions: res.questions });
      else setView({ kind: "done", note: res.note });
    });
  }

  const modes: Mode[] = hasContent ? ["sharpen", "simplify", "challenge", "ask"] : ["ask"];
  const close = () => setView({ kind: "closed" });

  if (view.kind === "closed") {
    return (
      <button type="button" onClick={() => setView({ kind: "menu" })} className="mt-2 self-start text-[11px] font-medium text-seagrass hover:text-coral transition-colors">
        ✨ {t("open")}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-seagrass/30 bg-seagrass/5 p-2 text-xs">
      {pending ? (
        <p className="text-dark-slate/60">{t("working")}</p>
      ) : view.kind === "menu" ? (
        <div className="flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <button key={m} type="button" onClick={() => run(m)} title={t(`hint_${m}`)} className="rounded-full border border-seagrass/40 bg-white px-2 py-0.5 text-[11px] text-dark-slate hover:border-coral hover:text-coral">
              {t(`mode_${m}`)}
            </button>
          ))}
          <button type="button" onClick={close} className="px-1 text-[11px] text-dark-slate/40 hover:text-dark-slate">
            {t("close")}
          </button>
        </div>
      ) : view.kind === "questions" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const answers = view.questions.map((q, i) => ({ question: q, answer: view.answers[i] })).filter((a) => a.answer.trim());
            if (answers.length) run("fromAnswers", answers);
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-seagrass">{t("questionsHeading")}</p>
          {view.questions.map((q, i) => (
            <label key={i} className="flex flex-col gap-1">
              <span className="text-dark-slate/80">{q}</span>
              <textarea
                rows={2}
                value={view.answers[i]}
                onChange={(e) => setView({ ...view, answers: view.answers.map((a, j) => (j === i ? e.target.value : a)) })}
                className="w-full rounded border border-muted-teal px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </label>
          ))}
          <div className="flex gap-3">
            <button type="submit" disabled={!view.answers.some((a) => a.trim())} className="rounded bg-coral px-3 py-1 text-xs font-medium text-white hover:bg-watermelon disabled:opacity-50">
              {t("createSuggestion")}
            </button>
            <button type="button" onClick={close} className="text-dark-slate/50 hover:text-dark-slate">
              {t("close")}
            </button>
          </div>
        </form>
      ) : view.kind === "challenges" ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-seagrass">{t("challengesHeading")}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-dark-slate/80">
            {view.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <button type="button" onClick={close} className="mt-1.5 text-[11px] text-dark-slate/50 hover:text-dark-slate">
            {t("close")}
          </button>
        </div>
      ) : view.kind === "done" ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-dark-slate/70">{view.note ?? t("suggestionReady")}</p>
          <button type="button" onClick={close} className="shrink-0 text-[11px] text-dark-slate/40 hover:text-dark-slate">
            {t("close")}
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="text-red-700">{view.message}</p>
          <button type="button" onClick={() => setView({ kind: "menu" })} className="shrink-0 text-[11px] text-dark-slate/50 hover:text-dark-slate">
            {t("back")}
          </button>
        </div>
      )}
    </div>
  );
}
