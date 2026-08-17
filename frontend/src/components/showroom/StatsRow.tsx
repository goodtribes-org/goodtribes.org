import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

export default async function StatsRow({
  locale,
  totalRaised,
  completedTasks,
  sdgCoveredCount,
  sdgTotalCount,
}: {
  locale: Locale;
  totalRaised: number;
  completedTasks: number;
  sdgCoveredCount: number;
  sdgTotalCount: number;
}) {
  const t = await getTranslations({ locale, namespace: "Showroom.statsRow" });
  const raisedLabel = `${new Intl.NumberFormat("sv-SE").format(totalRaised)} kr`;

  const cells = [
    { value: raisedLabel, label: t("raisedLabel") },
    { value: new Intl.NumberFormat("sv-SE").format(completedTasks), label: t("tasksLabel") },
    { value: `${sdgCoveredCount} / ${sdgTotalCount}`, label: t("sdgLabel") },
  ];

  return (
    <div className="max-w-[1160px] mx-auto px-8" style={{ padding: "72px 32px" }}>
      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 1,
          background: "rgba(178,176,155,.4)",
          border: "1px solid rgba(178,176,155,.4)",
          borderRadius: 20,
        }}
      >
        {cells.map((c) => (
          <div key={c.label} className="bg-[#FBFAF6]" style={{ padding: "32px 30px" }}>
            <p className={displaySerifFont.className} style={{ fontSize: "clamp(34px,3.6vw,46px)", lineHeight: 1, color: "var(--color-dark-slate)" }}>
              {c.value}
            </p>
            <p className={showroomMonoFont.className} style={{ fontSize: 11.5, letterSpacing: ".1em", color: "rgba(37,68,65,.55)" }}>
              {c.label.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
