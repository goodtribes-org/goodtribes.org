"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { newHomeDisplayFont } from "@/components/ny-startsida/fonts";
import {
  AMBITIONS,
  GUIDE_AREAS,
  MAX_ANSWER_LENGTH,
  MAX_NAME_LENGTH,
  TEAM_MODES,
  WEEKLY_HOURS,
  isVagueAnswer,
  type GuideArea,
  type GuideConditions,
  type GuideInput,
  type WeeklyHoursKey,
} from "@/lib/dreamGuide";
import { createProjectFromGuide, stashGuide, suggestGuideFollowUp } from "./guide-actions";

// Same key as the start page's dream box (DreamHero): what the visitor wrote
// there is the answer to the first question.
const HOME_DRAFT_KEY = "gt:new-home-dream";
// The whole guide, kept across the login round trip: the questions need no
// account, the login comes at "Skapa mitt projekt". Never in the URL.
const GUIDE_KEY = "gt:dream-guide";
const GUIDE_KEEP_MS = 24 * 60 * 60 * 1000;

type FollowUp = { question: string; answer: string };

export default function DreamGuide({
  isLoggedIn,
  aiAvailable,
  withoutAi = false,
  stashed = null,
  stashId,
}: {
  isLoggedIn: boolean;
  // AI configured and the flag on. Logged out it is unknown (the flag can be
  // per user), so the choice is shown and the server decides on create.
  aiAvailable: boolean;
  withoutAi?: boolean;
  // Back from logging in: the answers kept on the server (see
  // dreamGuideStash.ts), for when this origin's localStorage doesn't have them.
  stashed?: GuideInput | null;
  stashId?: string;
}) {
  const t = useTranslations("DreamGuide");
  const router = useRouter();
  const pathname = usePathname();
  const steps = GUIDE_AREAS.length + 2; // + conditions + summary
  const summaryStep = steps - 1;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<GuideArea, string>>>({});
  const [followUps, setFollowUps] = useState<Partial<Record<GuideArea, FollowUp>>>({});
  const [unknown, setUnknown] = useState<GuideArea[]>([]);
  const [conditions, setConditions] = useState<GuideConditions>({});
  const [name, setName] = useState("");
  const [withAi, setWithAi] = useState(!withoutAi && (aiAvailable || !isLoggedIn));
  const [fromHome, setFromHome] = useState(false);
  const [backFromLogin, setBackFromLogin] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(false);
  const [creating, startCreating] = useTransition();

  useEffect(() => {
    // Back from logging in: everything answered, straight to the summary.
    const restore = (g: GuideInput) => {
      setAnswers(g.answers ?? {});
      setFollowUps(g.followUps ?? {});
      setUnknown(Array.isArray(g.unknown) ? g.unknown : []);
      setConditions(g.conditions ?? {});
      setName(typeof g.name === "string" ? g.name : "");
      setWithAi(g.withAi !== false && (aiAvailable || !isLoggedIn));
      setBackFromLogin(isLoggedIn);
      setStep(summaryStep);
    };
    let local: (GuideInput & { at?: number }) | null = null;
    try {
      const raw = localStorage.getItem(GUIDE_KEY);
      if (raw) {
        localStorage.removeItem(GUIDE_KEY);
        local = JSON.parse(raw) as GuideInput & { at?: number };
      }
    } catch {}
    if (local && Date.now() - (local.at ?? 0) < GUIDE_KEEP_MS) return restore(local);
    if (stashed) return restore(stashed);
    // From the start page: question 1 is answered, go on to question 2.
    try {
      const raw = localStorage.getItem(HOME_DRAFT_KEY);
      if (!raw) return;
      localStorage.removeItem(HOME_DRAFT_KEY);
      const text = (JSON.parse(raw) as { text?: unknown }).text;
      if (typeof text !== "string" || !text.trim()) return;
      setAnswers((a) => ({ ...a, dream: text.trim().slice(0, MAX_ANSWER_LENGTH) }));
      setFromHome(true);
      setStep(1);
    } catch {}
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const area: GuideArea | undefined = GUIDE_AREAS[step];
  const input = (): GuideInput => ({ answers, followUps, unknown, conditions, name, withAi });
  const go = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  // "Nästa" on a vague answer asks one follow-up first (worded by the AI
  // when it's on); "Nästa" again moves on, answered or not.
  async function next() {
    if (area && !followUps[area] && !unknown.includes(area) && isVagueAnswer(answers[area] ?? "")) {
      setThinking(true);
      const suggestion = await suggestGuideFollowUp(area, answers[area] ?? "").catch(() => null);
      setThinking(false);
      // The AI found the answer concrete enough: move on.
      if (!suggestion || !("none" in suggestion)) {
        const question = suggestion?.question ?? t(`questions.${area}.followUp`);
        setFollowUps((f) => ({ ...f, [area]: { question, answer: "" } }));
        return;
      }
    }
    go(Math.min(step + 1, summaryStep));
  }

  function markUnknown(a: GuideArea, value: boolean) {
    setUnknown((u) => (value ? [...new Set([...u, a])] : u.filter((x) => x !== a)));
  }

  function create(ai: boolean) {
    setError(false);
    const data = { ...input(), withAi: ai };
    if (!isLoggedIn) {
      try {
        localStorage.setItem(GUIDE_KEY, JSON.stringify({ ...data, at: Date.now() }));
      } catch {}
      startCreating(async () => {
        // Also on the server, so the answers survive a login link that
        // opens on another origin or in another browser.
        const id = await stashGuide(data).catch(() => null);
        const back = id ? `${pathname}?guide=${id}` : pathname;
        router.push(`/login?from=dream&callbackUrl=${encodeURIComponent(back)}`);
      });
      return;
    }
    startCreating(async () => {
      try {
        await createProjectFromGuide(data, stashId);
      } catch (e) {
        // A redirect (to the new project) is thrown on purpose.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setError(true);
      }
    });
  }

  const progress = Math.round(((step + 1) / steps) * 100);
  const answeredAny = GUIDE_AREAS.some((a) => answers[a]?.trim() && !unknown.includes(a));

  return (
    <div className="mx-auto max-w-2xl py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dark-slate/45">{t("overline")}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-dark-slate/10">
        <div className="h-full rounded-full bg-seagrass transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-right text-xs text-dark-slate/45">{t("progress", { step: step + 1, total: steps })}</p>

      <div className="mt-4 rounded-3xl border border-dark-slate/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.15)] sm:p-8">
        {area && (
          <>
            {step === 0 && <p className="mb-4 text-sm text-dark-slate/65">{t("intro")}</p>}
            {fromHome && step === 1 && answers.dream && (
              <div className="mb-4 rounded-xl bg-seagrass/5 p-3 text-sm text-dark-slate/75">
                <span className="font-medium text-dark-slate">{t("fromHome")}</span>{" "}
                <span className="italic">&ldquo;{answers.dream}&rdquo;</span>{" "}
                <button type="button" onClick={() => go(0)} className="font-medium text-seagrass hover:underline">
                  {t("change")}
                </button>
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t(`questions.${area}.area`)}</p>
            <h1 className={`${newHomeDisplayFont.className} mt-1 text-2xl font-bold text-dark-slate sm:text-3xl`}>{t(`questions.${area}.title`)}</h1>
            <p className="mt-2 text-sm text-dark-slate/65">{t(`questions.${area}.help`)}</p>
            {unknown.includes(area) ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#E08A00]/50 bg-[#E08A00]/5 p-4 text-sm text-dark-slate/75">
                {t("unknownNote")}
                <button type="button" onClick={() => markUnknown(area, false)} className="ml-2 font-medium text-seagrass hover:underline">
                  {t("answerAnyway")}
                </button>
              </div>
            ) : (
              <>
                <label htmlFor={`guide-${area}`} className="sr-only">
                  {t(`questions.${area}.title`)}
                </label>
                <textarea
                  id={`guide-${area}`}
                  key={area}
                  autoFocus
                  rows={4}
                  maxLength={MAX_ANSWER_LENGTH}
                  value={answers[area] ?? ""}
                  onChange={(e) => {
                    setAnswers({ ...answers, [area]: e.target.value });
                    // A rewritten answer may not need the follow-up any more.
                    if (followUps[area] && !followUps[area]!.answer) setFollowUps((f) => ({ ...f, [area]: undefined }));
                  }}
                  placeholder={t("examplePrefix", { example: t(`questions.${area}.example`) })}
                  className="mt-4 w-full rounded-xl border border-dark-slate/20 px-4 py-3 text-sm text-dark-slate placeholder:text-dark-slate/35 focus:border-seagrass focus:outline-none"
                />
                {thinking && <p className="mt-3 text-sm text-dark-slate/50">{t("followUpThinking")}</p>}
                {followUps[area] && (
                  <div className="mt-3 rounded-xl border border-seagrass/30 bg-seagrass/5 p-4">
                    <label htmlFor={`guide-${area}-followup`} className="text-sm font-medium text-dark-slate">
                      <span aria-hidden>✨</span> {followUps[area]!.question}
                    </label>
                    <textarea
                      id={`guide-${area}-followup`}
                      autoFocus
                      rows={2}
                      maxLength={MAX_ANSWER_LENGTH}
                      value={followUps[area]!.answer}
                      onChange={(e) => setFollowUps({ ...followUps, [area]: { ...followUps[area]!, answer: e.target.value } })}
                      className="mt-2 w-full rounded-lg border border-dark-slate/15 bg-white px-3 py-2 text-sm focus:border-seagrass focus:outline-none"
                    />
                    <p className="text-[11px] text-dark-slate/45">{t("followUpHint")}</p>
                  </div>
                )}
              </>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="text-sm text-dark-slate/60 hover:text-dark-slate disabled:opacity-30">
                {t("back")}
              </button>
              <span className="flex items-center gap-4">
                {!unknown.includes(area) && (
                  <button
                    type="button"
                    onClick={() => {
                      markUnknown(area, true);
                      go(step + 1);
                    }}
                    className="text-sm text-dark-slate/55 hover:text-dark-slate"
                  >
                    {t("unknown")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={thinking}
                  className="rounded-full bg-seagrass px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-seagrass/90 disabled:opacity-60"
                >
                  {t("next")}
                </button>
              </span>
            </div>
          </>
        )}

        {step === GUIDE_AREAS.length && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t("conditions.area")}</p>
            <h1 className={`${newHomeDisplayFont.className} mt-1 text-2xl font-bold text-dark-slate sm:text-3xl`}>{t("conditions.heading")}</h1>
            <Chips
              label={t("conditions.time")}
              options={(Object.keys(WEEKLY_HOURS) as WeeklyHoursKey[]).map((k) => [k, t(`conditions.timeOptions.${k}`)])}
              value={conditions.time}
              onPick={(v) => setConditions({ ...conditions, time: v })}
            />
            <Chips
              label={t("conditions.team")}
              options={TEAM_MODES.map((k) => [k, t(`conditions.teamOptions.${k}`)])}
              value={conditions.team}
              onPick={(v) => setConditions({ ...conditions, team: v })}
            />
            <Chips
              label={t("conditions.ambition")}
              options={AMBITIONS.map((k) => [k, t(`conditions.ambitionOptions.${k}`)])}
              value={conditions.ambition}
              onPick={(v) => setConditions({ ...conditions, ambition: v })}
            />
            <label className="mt-5 block text-sm font-medium text-dark-slate">
              {t("conditions.nameLabel")} <span className="font-normal text-dark-slate/50">{t("conditions.nameOptional")}</span>
              <input
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-dark-slate/20 px-4 py-2.5 text-sm focus:border-seagrass focus:outline-none"
              />
            </label>
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => go(step - 1)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
                {t("back")}
              </button>
              <button type="button" onClick={() => go(summaryStep)} className="rounded-full bg-seagrass px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-seagrass/90">
                {t("conditions.toSummary")}
              </button>
            </div>
          </>
        )}

        {step === summaryStep && (
          <>
            {backFromLogin && <p className="mb-3 rounded-xl bg-seagrass/5 p-3 text-sm text-dark-slate/75">{t("summary.welcomeBack")}</p>}
            <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t("summary.area")}</p>
            <h1 className={`${newHomeDisplayFont.className} mt-1 text-2xl font-bold text-dark-slate sm:text-3xl`}>{t("summary.heading")}</h1>
            <ul className="mt-4 flex flex-col gap-3">
              {GUIDE_AREAS.map((a, i) => (
                <li key={a} className="rounded-xl border border-dark-slate/10 bg-dry-sage/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{t(`questions.${a}.area`)}</p>
                    <button type="button" onClick={() => go(i)} className="text-xs text-seagrass hover:underline">
                      {t("change")}
                    </button>
                  </div>
                  {unknown.includes(a) ? (
                    <p className="mt-1 text-sm text-[#9a5f00]">{t("unknownSummary")}</p>
                  ) : (
                    <p className="mt-1 whitespace-pre-line text-sm text-dark-slate/80">
                      {[answers[a], followUps[a]?.answer].filter((s) => s?.trim()).join("\n") || <span className="text-dark-slate/35">{t("noAnswer")}</span>}
                    </p>
                  )}
                </li>
              ))}
              <li className="rounded-xl border border-dark-slate/10 bg-dry-sage/5 p-3 text-sm text-dark-slate/80">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-slate/50">{t("conditions.area")}</p>
                  <button type="button" onClick={() => go(GUIDE_AREAS.length)} className="text-xs text-seagrass hover:underline">
                    {t("change")}
                  </button>
                </div>
                <p className="mt-1">
                  {[
                    conditions.time && t(`conditions.timeOptions.${conditions.time}`),
                    conditions.team && t(`conditions.teamOptions.${conditions.team}`),
                    conditions.ambition && t(`conditions.ambitionOptions.${conditions.ambition}`),
                    name.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </li>
            </ul>

            <div className="mt-5 rounded-2xl border border-dark-slate/10 p-4">
              <p className="text-sm font-semibold text-dark-slate">{t("summary.whatHappens")}</p>
              {isLoggedIn && !aiAvailable ? (
                <p className="mt-2 text-xs text-dark-slate/55">{t("summary.aiUnavailable")}</p>
              ) : (
                <div className="mt-2 flex gap-2 text-xs">
                  <button type="button" aria-pressed={withAi} onClick={() => setWithAi(true)} className={`rounded-full px-3 py-1 ${withAi ? "bg-seagrass text-white" : "border border-dark-slate/15 text-dark-slate/60"}`}>
                    {t("summary.withAi")}
                  </button>
                  <button type="button" aria-pressed={!withAi} onClick={() => setWithAi(false)} className={`rounded-full px-3 py-1 ${!withAi ? "bg-seagrass text-white" : "border border-dark-slate/15 text-dark-slate/60"}`}>
                    {t("summary.withoutAi")}
                  </button>
                </div>
              )}
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-dark-slate/75">
                {withAi ? (
                  <>
                    <li>{t("summary.ai1")}</li>
                    <li>{t("summary.ai2")}</li>
                  </>
                ) : (
                  <>
                    <li>{t("summary.manual1")}</li>
                    <li>{t("summary.manual2")}</li>
                  </>
                )}
                <li>{t("summary.openQuestions")}</li>
              </ul>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-coral/40 bg-coral/5 p-3 text-sm text-dark-slate/80">
                {t("summary.error")}
                {withAi && (
                  <button type="button" onClick={() => create(false)} className="ml-2 font-medium text-seagrass hover:underline">
                    {t("summary.retryWithoutAi")}
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => go(step - 1)} className="text-sm text-dark-slate/60 hover:text-dark-slate">
                {t("back")}
              </button>
              <button
                type="button"
                onClick={() => create(withAi)}
                disabled={creating || !answeredAny}
                className="rounded-full bg-seagrass px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-seagrass/90 disabled:opacity-60"
              >
                {creating ? t("summary.creating") : t("summary.create")}
              </button>
            </div>
            {!isLoggedIn && <p className="mt-3 text-right text-xs text-dark-slate/50">{t("summary.loginNote")}</p>}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-dark-slate/45">
        {t.rich("formInstead", {
          link: (chunks) => (
            <Link href="/projects/new?manual=1" className="text-seagrass hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

function Chips<K extends string>({ label, options, value, onPick }: { label: string; options: [K, string][]; value?: K; onPick: (v: K) => void }) {
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-dark-slate">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([k, text]) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onPick(k)}
            className={`rounded-full px-4 py-2 text-sm transition ${value === k ? "bg-seagrass text-white" : "border border-dark-slate/15 text-dark-slate/70 hover:border-seagrass"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
