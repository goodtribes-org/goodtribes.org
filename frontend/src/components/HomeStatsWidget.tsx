import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomeStatsWidget({
  projectCount,
  orgCount,
  memberCount,
}: {
  projectCount: number;
  orgCount: number;
  memberCount: number;
}) {
  const t = await getTranslations("HomeStatsWidget");
  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">{t("heading")}</h2>
        <Link href="#projects" className="text-xs text-seagrass hover:underline">
          {t("exploreProjectsLink")}
        </Link>
      </div>

      <div className="space-y-2">
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{projectCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">{t("activeProjects")}</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{orgCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">{t("organisations")}</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{memberCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">{t("volunteers")}</p>
        </div>
      </div>
    </section>
  );
}
