import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";
import { getFoundingStoryData } from "@/lib/impactReports";

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

  const { project, reports } = data;
  const paragraphs = [c("body1"), c("body2"), c("body3")].filter(Boolean);

  return (
    <section className={homeSansFont.className} style={{ paddingTop: 40, paddingBottom: 40 }}>
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

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div className="space-y-3" style={{ maxWidth: "62ch" }}>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-dark-slate/70" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
              {p}
            </p>
          ))}
          <p style={{ paddingTop: 4 }}>
            <Link
              href={`/projects/${project.slug}`}
              className="text-coral hover:underline"
              style={{ fontSize: 13.5, fontWeight: 500 }}
            >
              {c("cta")} →
            </Link>
          </p>
        </div>

        {reports.length > 0 && (
          <div
            className="rounded-xl"
            style={{
              background: "#fafaf8",
              border: "1px solid rgba(178,176,155,.35)",
              padding: 20,
            }}
          >
            <p
              className={showroomMonoFont.className}
              style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--color-dark-slate)", opacity: 0.4 }}
            >
              {c("statsLabel").toUpperCase()}
            </p>
            <div className="space-y-4" style={{ marginTop: 14 }}>
              {reports.map((r) => (
                <div key={r.id}>
                  <p className="text-dark-slate font-bold" style={{ fontSize: 22, letterSpacing: "-.01em" }}>
                    {r.valueQualifier !== "EXACT" && (
                      <span className="text-dark-slate/50" style={{ fontSize: 13, fontWeight: 400, marginRight: 4 }}>
                        {t(`qualifier.${r.valueQualifier}`)}
                      </span>
                    )}
                    {r.metricValue.toLocaleString(locale)}
                    {r.metricUnit && (
                      <span className="text-dark-slate/40" style={{ fontSize: 13, fontWeight: 400, marginLeft: 4 }}>
                        {r.metricUnit}
                      </span>
                    )}
                  </p>
                  <p className="text-dark-slate/55" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
                    {r.metricDescription}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-dark-slate/35" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.45 }}>
              {c("statsFootnote")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
