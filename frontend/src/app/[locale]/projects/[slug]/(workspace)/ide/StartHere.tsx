import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Guess } from "@/lib/ideaStart";
import { sectionAnchor } from "@/lib/ideaStart";
import GuessCard from "./GuessCard";

// The top of the Idé page once the AI has filled the phase in: what you said
// versus what the AI guessed, and three things to do, in order — Kritikern's
// main objection, the guesses the idea rests on, and the interviews. Replaces
// the old "31 av 31 fält är AI-utkast" notice; the sections themselves follow
// below, folded (CollapsibleSection), under "Allt AI:n har tagit fram".
export default async function StartHere({
  locale,
  slug,
  said,
  guessed,
  guesses,
  unansweredCount,
  topCritique,
  fieldLabels,
  interviewCount,
  hasInterviewGuide,
}: {
  locale: string;
  slug: string;
  said: number;
  guessed: number;
  guesses: Guess[];
  unansweredCount: number;
  topCritique: string | null;
  fieldLabels: Record<string, string>;
  interviewCount: number;
  hasInterviewGuide: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "IdeaStart" });
  const step = (n: number) => (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-seagrass text-sm font-bold text-white" aria-hidden>
      {n}
    </span>
  );

  return (
    <>
      <section aria-labelledby="start-summary" className="rounded-2xl border border-muted-teal/30 bg-white p-5">
        <h2 id="start-summary" className="text-lg font-semibold text-dark-slate">{t("summaryHeading")}</h2>
        <p className="mt-1 text-sm text-dark-slate/70">{t("summaryBody")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-seagrass/10 p-4">
            <p className="text-3xl font-bold text-seagrass">{said}</p>
            <p className="text-sm text-dark-slate/70">{t("said", { count: said })}</p>
          </div>
          <div className="rounded-xl bg-amber-100 p-4">
            <p className="text-3xl font-bold text-amber-700">{guessed}</p>
            <p className="text-sm text-dark-slate/70">{t("guessed", { count: guessed })}</p>
          </div>
        </div>
      </section>

      <section id="borja-har" aria-labelledby="borja-har-heading" className="scroll-mt-24 rounded-2xl border-2 border-seagrass/50 bg-white p-5">
        <h2 id="borja-har-heading" className="text-lg font-semibold text-dark-slate">{t("heading")}</h2>
        <p className="mt-1 text-sm text-dark-slate/60">{t("intro")}</p>

        <ol className="mt-4 flex flex-col gap-5">
          <li className="flex gap-3">
            {step(1)}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-dark-slate">{t("critiqueStep")}</p>
              {topCritique ? (
                <>
                  <blockquote className="mt-2 border-l-4 border-watermelon/60 bg-watermelon/5 px-3 py-2 text-sm text-dark-slate/80">{topCritique}</blockquote>
                  <a href="#critique-heading" className="mt-2 inline-block text-sm font-medium text-seagrass hover:underline">{t("critiqueAll")}</a>
                </>
              ) : (
                <p className="mt-1 text-sm text-dark-slate/60">{t("critiqueNone")}</p>
              )}
            </div>
          </li>

          <li className="flex gap-3">
            {step(2)}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-dark-slate">{t("guessesStep")}</p>
              {guesses.length > 0 ? (
                <>
                  <p className="mt-1 text-sm text-dark-slate/60">{t("guessesIntro")}</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {guesses.map((g) => (
                      <GuessCard key={g.key} slug={slug} fieldKey={g.key} label={fieldLabels[g.key] ?? g.key} text={g.text} anchor={sectionAnchor(g.key)} />
                    ))}
                  </ul>
                  {unansweredCount > guesses.length && (
                    <p className="mt-2 text-xs text-dark-slate/50">{t("guessesMore", { count: unansweredCount - guesses.length })}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-dark-slate/60">{t("guessesDone")}</p>
              )}
            </div>
          </li>

          <li className="flex gap-3">
            {step(3)}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-dark-slate">{t("interviewsStep")}</p>
              <p className="mt-1 text-sm text-dark-slate/60">
                {t("interviewsBody")} {interviewCount > 0 && t("interviewsLogged", { count: interviewCount })}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {hasInterviewGuide && (
                  <Link href={`/projects/${slug}/wiki/intervjuguide`} className="font-medium text-seagrass hover:underline">{t("openGuide")}</Link>
                )}
                <Link href={`/projects/${slug}/interviews`} className="font-medium text-seagrass hover:underline">{t("logInterview")}</Link>
              </div>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}
