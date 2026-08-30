import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { homeSansFont, showroomMonoFont } from "@/lib/fonts";

export default async function VisionMissionGoal({ locale, copy }: { locale: Locale; copy: Record<string, string> }) {
  const t = await getTranslations({ locale, namespace: "HomePage.visionMissionGoal" });
  const c = (key: string) => copy[`HomePage.visionMissionGoal.${key}`] ?? t(key);

  const columns = [
    { label: c("visionLabel"), color: "var(--color-watermelon)", body: c("visionBody") },
    { label: c("missionLabel"), color: "#12486C", body: c("missionBody") },
    { label: c("goalLabel"), color: "var(--color-seagrass)", body: c("goalBody") },
  ];

  return (
    <div className={`${homeSansFont.className} max-w-[1160px] mx-auto px-8`} style={{ padding: "0 32px 44px" }}>
      <div className="grid gap-px bg-muted-teal/20 border border-muted-teal/20 rounded-[10px] overflow-hidden" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {columns.map((col) => (
          <div key={col.label} className="bg-white" style={{ padding: 26 }}>
            <p className={showroomMonoFont.className} style={{ fontSize: 16, letterSpacing: ".07em", color: col.color, fontWeight: 600 }}>
              {col.label}
            </p>
            <p className="text-dark-slate" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>
              {col.body}
            </p>
          </div>
        ))}
      </div>
      <p className="text-dark-slate/45" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 24, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>
        {c("foundationNote")}
      </p>
    </div>
  );
}
