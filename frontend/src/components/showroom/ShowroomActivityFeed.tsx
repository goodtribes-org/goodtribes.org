import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { displaySerifFont, showroomMonoFont } from "@/lib/fonts";

export type ShowroomFeedEvent = {
  key: string;
  project: string;
  action: string;
  meta: string;
  initials: string;
};

export default async function ShowroomActivityFeed({ locale, events }: { locale: Locale; events: ShowroomFeedEvent[] }) {
  const t = await getTranslations({ locale, namespace: "Showroom.activityFeed" });

  return (
    <div id="showroom-flode" className="max-w-[1160px] mx-auto px-8" style={{ padding: "56px 32px 24px" }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className={`${displaySerifFont.className} text-dark-slate`} style={{ fontSize: "clamp(30px,3vw,40px)", lineHeight: 1.1 }}>
          {t("heading")}
        </h2>
        <a href="/feed" className="text-coral hover:underline" style={{ fontSize: 14.5 }}>
          {t("seeAllLink")}
        </a>
      </div>
      <p className="text-dark-slate/60 mb-6" style={{ fontSize: 15.5 }}>
        {t("subheading")}
      </p>

      {events.length > 0 && (
        <div
          className="flex flex-col overflow-hidden"
          style={{ gap: 1, background: "rgba(178,176,155,.4)", border: "1px solid rgba(178,176,155,.4)", borderRadius: 18 }}
        >
          {events.map((e) => (
            <div key={e.key} className="bg-white flex items-start gap-3.5" style={{ padding: "18px 22px" }}>
              <span
                className="flex-shrink-0 rounded-full bg-seagrass text-white flex items-center justify-center font-medium"
                style={{ width: 34, height: 34, fontSize: 12.5 }}
              >
                {e.initials}
              </span>
              <div className="min-w-0">
                <p className="text-dark-slate" style={{ fontSize: 15, lineHeight: 1.5 }}>
                  <span className="font-medium text-seagrass">{e.project}</span> — {e.action}
                </p>
                <p className={showroomMonoFont.className} style={{ fontSize: 11, color: "rgba(37,68,65,.45)" }}>
                  {e.meta}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
