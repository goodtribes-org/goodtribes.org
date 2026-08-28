import Link from "next/link";
import {
  relativeTime,
  activityIcon,
  activityDescription,
  dateGroupLabel,
  type DateGroupKey,
  type T,
} from "./workplaceHelpers";

type ActivityEvent = {
  id: string;
  type: string;
  createdAt: Date;
  project: { title: string; slug: string };
};

type GroupedEvents = { key: DateGroupKey; events: ActivityEvent[] }[];

export default function WorkplaceActivityTab({
  t,
  distinctProjectCount,
  activitiesThisMonth,
  ideasCount,
  groupedEvents,
}: {
  t: T;
  distinctProjectCount: number;
  activitiesThisMonth: number;
  ideasCount: number;
  groupedEvents: GroupedEvents;
}) {
  // groupedEvents only ever contains groups with >=1 event (built by pushing
  // events one at a time in the parent), so an empty array means "no events".
  const hasAnyEvents = groupedEvents.length > 0;

  return (
    <div className="space-y-10">
      {/* Sammanfattning */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("summaryHeading")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
            <span className="text-3xl font-bold text-seagrass">{distinctProjectCount}</span>
            <span className="text-sm text-dark-slate/60">{t("projectsContributed")}</span>
          </div>
          <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
            <span className="text-3xl font-bold text-seagrass">{activitiesThisMonth}</span>
            <span className="text-sm text-dark-slate/60">{t("activitiesThisMonthLabel")}</span>
          </div>
          <div className="border border-muted-teal rounded-lg p-5 flex flex-col gap-1">
            <span className="text-3xl font-bold text-seagrass">{ideasCount}</span>
            <span className="text-sm text-dark-slate/60">{t("ideasSubmitted")}</span>
          </div>
        </div>
      </section>

      {/* Senaste aktivitet */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("recentActivityHeading")}</h2>
        {!hasAnyEvents ? (
          <p className="text-dark-slate/50 italic text-sm">
            {t("noActivityEventsYet")}
          </p>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-dark-slate/40 mb-3">
                  {dateGroupLabel(t, group.key)}
                </p>
                <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
                  {group.events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/projects/${event.project.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                    >
                      <span className="text-lg flex-shrink-0 w-7 text-center" aria-hidden="true">
                        {activityIcon(event.type)}
                      </span>
                      <span className="flex-1 text-sm text-dark-slate">
                        {activityDescription(t, event.type, event.project.title)}
                      </span>
                      <span className="text-xs text-dark-slate/40 flex-shrink-0">
                        {relativeTime(t, event.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
