import type { useTranslations } from "next-intl";

export default function MiniCalendar({ events, t }: { events: { startsAt: Date }[]; t: ReturnType<typeof useTranslations> }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: 0=Mon … 6=Sun
  const startDow = (firstDay.getDay() + 6) % 7;

  const eventDays = new Set(
    events
      .filter((e) => {
        const d = e.startsAt;
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((e) => e.startsAt.getDate())
  );
  const today = now.getDate();

  const monthName = now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const dayLabels = [
    t("calendarDayMon"),
    t("calendarDayTue"),
    t("calendarDayWed"),
    t("calendarDayThu"),
    t("calendarDayFri"),
    t("calendarDaySat"),
    t("calendarDaySun"),
  ];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="text-xs select-none">
      <div className="font-semibold text-dark-slate mb-2 capitalize">{monthName}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-dark-slate/40 font-medium pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === today;
          const hasEvent = eventDays.has(day);
          return (
            <div
              key={i}
              className={`py-0.5 rounded font-medium ${
                isToday
                  ? "bg-coral text-white"
                  : hasEvent
                  ? "bg-seagrass/20 text-seagrass font-semibold"
                  : "text-dark-slate/60"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
