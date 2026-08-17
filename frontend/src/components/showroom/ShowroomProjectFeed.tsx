import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import ProjectCard, { type ProjectCardData } from "@/components/ProjectCard";
import { displaySerifFont } from "@/lib/fonts";

export default async function ShowroomProjectFeed({ locale, projects }: { locale: Locale; projects: ProjectCardData[] }) {
  const t = await getTranslations({ locale, namespace: "Showroom.projectFeed" });
  if (projects.length === 0) return null;

  return (
    <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "8px 32px 20px" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(30px,3vw,40px)", lineHeight: 1.1 }}>
          {t("heading")}
        </h2>
        <Link href="/projects" className="text-coral hover:underline" style={{ fontSize: 14.5 }}>
          {t("seeAllLink")}
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[18px]">
        {projects.slice(0, 4).map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </div>
  );
}
