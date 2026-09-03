import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { siteSansFont, showroomMonoFont } from "@/lib/fonts";
import { SdgIcon } from "@/components/SdgIcon";
import { getFoundingStoryData, verifiedSdgGoals } from "@/lib/impactReports";

type Report = NonNullable<Awaited<ReturnType<typeof getFoundingStoryData>>>["delivered"][number];

// One concrete example of what a project on this platform can amount to,
// placed between the platform-wide impact numbers and the tools — aggregate
// proof, then a single story that makes it real, then "here's how you do it".
//
// The figures are read live from the project's *verified* impact reports
// rather than written into the copy: a number on the homepage and a number on
// the project page that disagree is exactly the credibility problem the whole
// verification flow exists to prevent. The prose is deliberately number-free
// so the two can never drift apart in the first place.
//
// Renders nothing at all when the configured project doesn't exist in this
// environment (it's seeded data, not a schema guarantee), so a fresh database
// gets no heading over a dead link.
export default async function FoundingStory({
  locale,
  copy,
}: {
  locale: Locale;
  copy: Record<string, string>;
}) {
  const t = await getTranslations({ locale, namespace: "HomePage.foundingStory" });
  const c = (key: string) => copy[`HomePage.foundingStory.${key}`] ?? t(key);

  const data = await getFoundingStoryData(c("projectSlug"));
  if (!data) return null;

  const { project, delivered, supportReceived } = data;
  const paragraphs = [c("body1"), c("body2"), c("body3")].filter(Boolean);
  // Only delivered results define what this project has verified impact *on* —
  // an SDG tagged on a grant it received describes the funder.
  const goals = verifiedSdgGoals(delivered);

  const num = (n: number) => n.toLocaleString(locale);
  const period = (r: Report) => {
    const from = r.periodStart?.getFullYear();
    const to = r.periodEnd?.getFullYear();
    if (from && to) return from === to ? `${from}` : `${from}–${to}`;
    return from ? t("since", { year: from }) : null;
  };

  return (
    <section className={siteSansFont.className} style={{ paddingTop: 40, paddingBottom: 40 }}>
      <p
        className={showroomMonoFont.className}
        style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}
      >
        {c("eyebrow").toUpperCase()}
      </p>
      <h2
        className="text-dark-slate"
        style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8, marginBottom: 16 }}
      >
        {c("heading")}
      </h2>

      <div className="grid gap-x-10 gap-y-3 md:grid-cols-2" style={{ marginBottom: 28 }}>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-dark-slate/70" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
            {p}
          </p>
        ))}
      </div>

      {goals.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" style={{ marginBottom: 20 }}>
          <span className={showroomMonoFont.className} style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--color-dark-slate)", opacity: .4, marginRight: 4 }}>
            {c("sdgLabel").toUpperCase()}
          </span>
          {goals.map((n) => (
            <SdgIcon key={n} n={n} size={28} />
          ))}
        </div>
      )}

      {/* Delivered impact — the headline figures */}
      {delivered.length > 0 && (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}
        >
          {delivered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl"
              style={{ background: "#fafaf8", border: "1px solid rgba(178,176,155,.35)", padding: "16px 18px" }}
            >
              <p className="text-dark-slate font-bold" style={{ fontSize: 26, letterSpacing: "-.015em", lineHeight: 1.1 }}>
                {r.valueQualifier !== "EXACT" && (
                  <span className="text-dark-slate/45" style={{ fontSize: 14, fontWeight: 400, marginRight: 5 }}>
                    {t(`qualifier.${r.valueQualifier}`)}
                  </span>
                )}
                {num(r.metricValue)}
                {r.metricUnit && (
                  <span className="text-dark-slate/40" style={{ fontSize: 14, fontWeight: 400, marginLeft: 5 }}>
                    {r.metricUnit}
                  </span>
                )}
              </p>
              <p className="text-dark-slate/60" style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 6 }}>
                {r.metricDescription}
              </p>
              {(period(r) || r.isCumulative) && (
                <p className="text-dark-slate/35" style={{ fontSize: 11, marginTop: 6 }}>
                  {r.isCumulative ? c("cumulativeNote") : period(r)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Support received — deliberately a quiet line, not a tile. These are
          resources that made the work possible, not results the project
          achieved, and equal visual weight would read as if they were. */}
      {supportReceived.length > 0 && (
        <p className="text-dark-slate/45 flex flex-wrap items-baseline gap-x-2" style={{ fontSize: 12.5, marginTop: 18 }}>
          <span className={showroomMonoFont.className} style={{ fontSize: 10, letterSpacing: ".12em", opacity: .75 }}>
            {c("supportLabel").toUpperCase()}
          </span>
          {supportReceived.map((r, i) => (
            <span key={r.id}>
              {i > 0 && <span style={{ marginRight: 8 }}>·</span>}
              <span className="text-dark-slate/65">{r.sourceName ?? r.metricDescription}</span>{" "}
              {num(r.metricValue)} {r.metricUnit}
            </span>
          ))}
        </p>
      )}

      <p style={{ marginTop: 22 }}>
        <Link
          href={`/projects/${project.slug}`}
          className="text-coral hover:underline"
          style={{ fontSize: 13.5, fontWeight: 500 }}
        >
          {c("cta")} →
        </Link>
        <span className="text-dark-slate/35" style={{ fontSize: 12, marginLeft: 10 }}>
          {c("statsFootnote")}
        </span>
      </p>
    </section>
  );
}
