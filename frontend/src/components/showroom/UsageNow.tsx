import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import Link from "next/link";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";
import { PROJECT_PHASE_LABEL } from "@/lib/projectPhase";

export type UsageNowProject = {
  slug: string;
  title: string;
  slogan?: string | null;
  summary: string | null;
  phase: string;
};

export default async function UsageNow({ locale, projects }: { locale: Locale; projects: UsageNowProject[] }) {
  const t = await getTranslations({ locale, namespace: "HomePage.usageNow" });

  if (projects.length === 0) return null;

  return (
    <div className={`${homeSansFont.className} max-w-[1160px] mx-auto px-8`} style={{ padding: "56px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <p className={showroomMonoFont.className} style={{ fontSize: 11, letterSpacing: ".14em", color: "var(--color-seagrass)" }}>
          {t("eyebrow").toUpperCase()}
        </p>
        <h2 className="text-dark-slate" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.01em", marginTop: 8 }}>
          {t("heading")}
        </h2>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {projects.slice(0, 6).map((p) => (
          <Link
            key={p.slug}
            href={`/projects/${p.slug}`}
            className="bg-white border border-muted-teal/35 rounded-xl hover:border-coral/60 transition-colors flex flex-col"
            style={{ padding: 20, gap: 6 }}
          >
            <p className="text-dark-slate" style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</p>
            <p className="text-dark-slate/60 line-clamp-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {p.slogan ?? p.summary ?? ""}
            </p>
            <p className="text-dark-slate/40" style={{ fontSize: 11.5, marginTop: "auto", paddingTop: 8 }}>
              {PROJECT_PHASE_LABEL[p.phase] ?? p.phase}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
