"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { applyInterviewGuide } from "./actions";

// The interview template for a team that writes its own questions (#207).
// Interviews exist to test the assumptions: everything in the canvas, value
// proposition and impact model not marked "Klart — ni vet". So the template
// starts from the project's own assumptions (most testable first), teaches
// turning an assumption into a question, gives those questions their place
// in the conversation, and saves it all as the project's interview guide.

type Assumption = { label: string; text: string };

const MAX_SHOWN = 6;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function InterviewTemplate({
  slug,
  canEdit,
  customerSegments,
  assumptions,
}: {
  slug: string;
  canEdit: boolean;
  customerSegments: string | null;
  assumptions: Assumption[];
}) {
  const t = useTranslations("InterviewTemplate");
  const router = useRouter();
  const shown = assumptions.slice(0, MAX_SHOWN);
  const [questions, setQuestions] = useState<string[]>(() => shown.map(() => ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const parts = [
    { key: "warmup", questions: [t("q.warmup1")] },
    { key: "assumptions", highlight: true },
    { key: "today", questions: [t("q.today1"), t("q.today2"), t("q.today3")] },
    { key: "close", questions: [t("q.close1"), t("q.close2"), t("q.close3")] },
  ];

  // The saved guide: the team's own questions, each with what it tests,
  // around the template's fixed parts.
  function guideHtml(): string {
    const own = shown
      .map((a, i) => ({ a, q: questions[i]?.trim() }))
      .filter((x) => x.q)
      .map((x) => `<li>${esc(x.q!)}<br><em>${esc(t("tests"))}: ${esc(x.a.label)}</em></li>`);
    return [
      `<p><em>${esc(t("savedNote"))}</em></p>`,
      `<h2>${esc(t("purposeHeading"))}</h2><ul>${shown.map((a) => `<li><strong>${esc(a.label)}:</strong> ${esc(a.text)}</li>`).join("")}</ul>`,
      `<h2>${esc(t("whoHeading"))}</h2><p>${esc(customerSegments?.trim() || t("whoFallback"))} ${esc(t("whoTip"))}</p>`,
      `<h2>${esc(t("questionsHeading"))}</h2><ol>`,
      `<li>${esc(t("q.warmup1"))}</li>`,
      ...own,
      ...["today1", "today2", "today3", "close1", "close2", "close3"].map((k) => `<li>${esc(t(`q.${k}`))}</li>`),
      `</ol>`,
      `<h2>${esc(t("tipsHeading"))}</h2><ul>${["do1", "do2", "do3", "dont1", "dont2", "dont3"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>`,
    ].join("");
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await applyInterviewGuide(slug, guideHtml());
      if ("error" in res) return setError(res.error);
      router.refresh();
    });
  }

  const ownCount = questions.filter((q) => q.trim()).length;

  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-dark-slate/10 pt-6 print:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-slate/45">{t("eyebrow")}</p>
          <p className="text-lg font-semibold text-dark-slate">{t("heading")}</p>
        </div>
        <span className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-full border border-dark-slate/15 px-3 py-1.5 text-sm text-dark-slate/70 hover:text-dark-slate">
            🖨 {t("print")}
          </button>
          {canEdit && (
            <button type="button" onClick={save} disabled={pending || (shown.length > 0 && ownCount === 0)} className="rounded-full bg-seagrass px-4 py-1.5 text-sm font-semibold text-white hover:bg-seagrass/90 disabled:opacity-50">
              {pending ? t("saving") : t("save")}
            </button>
          )}
        </span>
      </div>
      {canEdit && shown.length > 0 && ownCount === 0 && <p className="-mt-3 text-xs text-dark-slate/55 print:hidden">{t("saveHint")}</p>}
      {error && <p className="-mt-3 text-xs text-watermelon">{error}</p>}

      <div className="rounded-2xl border border-[#E08A00]/40 bg-[#E08A00]/5 p-4">
        <p className="text-sm font-semibold text-dark-slate">{t("whyHeading")}</p>
        <p className="mt-1 text-sm text-dark-slate/75">{t("whyBody")}</p>
      </div>

      {/* 1. The assumptions, each with room for a question. */}
      <Box>
        <p className="text-sm font-semibold text-dark-slate">{t("step1Heading")}</p>
        <p className="mt-0.5 text-sm text-dark-slate/65">{t("step1Body")}</p>
        {shown.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-3">
            {shown.map((a, i) => (
              <li key={`${a.label}-${i}`} className="rounded-xl border border-dark-slate/10 bg-dry-sage/5 p-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded-full border border-[#E08A00]/50 bg-[#E08A00]/10 px-2 py-0.5 text-[11px] font-medium text-[#9a5f00]">{a.label}</span>
                  <p className="line-clamp-2 min-w-0 flex-1 text-sm text-dark-slate/80">”{a.text}”</p>
                </div>
                <label className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{t("yourQuestion")}</span>
                  <input
                    value={questions[i] ?? ""}
                    onChange={(e) => setQuestions((qs) => qs.map((q, j) => (j === i ? e.target.value : q)))}
                    disabled={!canEdit}
                    placeholder={t("questionHint")}
                    className="rounded-lg border border-dashed border-dark-slate/25 bg-white px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none"
                  />
                </label>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-xl bg-dry-sage/10 p-3 text-sm text-dark-slate/70">{t("noAssumptions")}</p>
        )}
        {assumptions.length > MAX_SHOWN && <p className="mt-2 text-xs text-dark-slate/55">{t("more", { count: assumptions.length - MAX_SHOWN })}</p>}
      </Box>

      {/* Assumption → question. */}
      <Box>
        <p className="text-sm font-semibold text-dark-slate">{t("howHeading")}</p>
        <p className="mt-0.5 text-sm text-dark-slate/65">{t("howBody")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Example tone="plain" label={t("exAssumptionLabel")} text={t("exAssumption")} />
          <Example tone="bad" label={t("exBadLabel")} text={t("exBad")} />
          <Example tone="good" label={t("exGoodLabel")} text={t("exGood")} />
        </div>
      </Box>

      {/* 2. Who. */}
      <div className="rounded-2xl border border-dark-slate/10 bg-dry-sage/10 p-4">
        <p className="text-sm font-semibold text-dark-slate">{t("step2Heading")}</p>
        {customerSegments?.trim() ? (
          <p className="mt-1 line-clamp-3 text-sm text-dark-slate/80">{customerSegments}</p>
        ) : (
          <p className="mt-1 text-sm text-[#B5524C]">{t("segmentsEmpty")}</p>
        )}
        <p className="mt-2 text-xs text-dark-slate/55">{t("whoTip")}</p>
      </div>

      {/* 3. The conversation, the assumption questions in the middle. */}
      <Box>
        <p className="text-sm font-semibold text-dark-slate">{t("step3Heading")}</p>
        <ol className="mt-3 flex flex-col gap-4">
          {parts.map((p, i) => (
            <li key={p.key} className={`flex gap-3 ${p.highlight ? "-mx-2 rounded-xl border border-[#E08A00]/40 bg-[#E08A00]/5 p-2" : ""}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${p.highlight ? "bg-[#E08A00]" : "bg-dark-slate"}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-dark-slate">
                  {t(`part.${p.key}`)} <span className="font-normal text-dark-slate/45">· {t(`time.${p.key}`)}</span>
                </p>
                {p.questions ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-dark-slate/80">
                    {p.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-dark-slate/75">{t("assumptionPart")}</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-dark-slate/80">
                      <li>{t("followUp1")}</li>
                      <li>{t("followUp2")}</li>
                      <li>{t("followUp3")}</li>
                    </ul>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Box>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-seagrass/30 bg-seagrass/5 p-4">
          <p className="text-sm font-semibold text-seagrass">{t("doHeading")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-dark-slate/80">
            <li>{t("do1")}</li>
            <li>{t("do2")}</li>
            <li>{t("do3")}</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[#B5524C]/25 bg-[#B5524C]/5 p-4">
          <p className="text-sm font-semibold text-[#B5524C]">{t("dontHeading")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-dark-slate/80">
            <li>{t("dont1")}</li>
            <li>{t("dont2")}</li>
            <li>{t("dont3")}</li>
          </ul>
        </div>
      </div>

      {/* 4. After: what happened to the assumptions. */}
      <Box>
        <p className="text-sm font-semibold text-dark-slate">{t("step4Heading")}</p>
        <p className="mt-0.5 text-xs text-dark-slate/55">{t("step4Body")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["who", "problem", "held", "quote"] as const).map((k) => (
            <div key={k}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{t(`after.${k}`)}</p>
              <div className="mt-1 rounded-lg border border-dashed border-dark-slate/25 bg-white px-3 py-2 text-sm text-dark-slate/40">{t(`afterHint.${k}`)}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-dark-slate/60">{t("step4Close")}</p>
      </Box>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dark-slate/10 bg-white p-5">{children}</div>;
}

function Example({ tone, label, text }: { tone: "plain" | "bad" | "good"; label: string; text: string }) {
  const cls = tone === "bad" ? "border border-[#B5524C]/25 bg-[#B5524C]/5" : tone === "good" ? "border border-seagrass/30 bg-seagrass/5" : "bg-dry-sage/10";
  const head = tone === "bad" ? "text-[#B5524C]" : tone === "good" ? "text-seagrass" : "text-dark-slate/50";
  return (
    <div className={`rounded-xl p-3 text-sm ${cls}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${head}`}>{label}</p>
      <p className="mt-1 text-dark-slate/80">{text}</p>
    </div>
  );
}
