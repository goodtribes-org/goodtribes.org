import { getTranslations } from "next-intl/server";
import { getMyCalendar } from "@/lib/myGoodTribes";
import { Panel, Empty, Row } from "./parts";

export default async function CalendarTab({ userId, locale }: { userId: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "MyGoodTribes" });
  const fmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const dayFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
  const items = await getMyCalendar(userId);

  return (
    <Panel title={t("calendarTitle")}>
      {items.length === 0 ? (
        <Empty>{t("calendarEmpty")}</Empty>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((i) => (
            <Row
              key={`${i.kind}-${i.id}`}
              href={i.href}
              title={i.kind === "milestone" ? t("milestone", { title: i.title }) : i.title}
              dot={i.kind === "milestone" ? "#E8531F" : "#12486C"}
              meta={`${i.kind === "milestone" ? dayFmt.format(i.at) : fmt.format(i.at)} · ${i.project.title}`}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
