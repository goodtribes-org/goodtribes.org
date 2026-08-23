import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

export default async function VisionMissionGoal({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "HomePage.visionMissionGoal" });

  const columns = [
    { label: t("visionLabel"), color: "var(--color-watermelon)", body: t("visionBody") },
    { label: t("missionLabel"), color: "#12486C", body: t("missionBody") },
    { label: t("goalLabel"), color: "var(--color-seagrass)", body: t("goalBody") },
  ];

  return (
    <div className={`${homeSansFont.className} max-w-[1160px] mx-auto px-8`} style={{ padding: "0 32px 44px" }}>
      <div className="grid gap-px bg-muted-teal/20 border border-muted-teal/20 rounded-[10px] overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {columns.map((col) => (
          <div key={col.label} className="bg-white" style={{ padding: 26 }}>
            <p className={showroomMonoFont.className} style={{ fontSize: 10.5, letterSpacing: ".12em", color: col.color, fontWeight: 600 }}>
              {col.label}
            </p>
            <p className="text-dark-slate" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>
              {col.body}
            </p>
          </div>
        ))}
      </div>
      <p className="text-dark-slate/45" style={{ fontSize: 12.5, lineHeight: 1.5, maxWidth: "64ch", marginTop: 24 }}>
        {t("foundationNote")}
      </p>
    </div>
  );
}
