import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import FirstTaskCard from "@/components/FirstTaskCard";
import type { FirstTaskListItem } from "@/lib/firstTasks";
import { ACCENT_CARDS, ACCENTS, SWIPE_ITEM, SWIPE_ROW, SectionHeader, accentStyle, wrap } from "./Sections";

// "Första uppgifter i drömmar som pågår" on the start page (#279), right
// under the dream box: the other way in — help someone else's dream with one
// small, concrete thing. Renders nothing while no project has opened one.
export default async function FirstTasksSection({ locale, tasks }: { locale: Locale; tasks: FirstTaskListItem[] }) {
  if (tasks.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "FirstTasksDiscover" });
  return (
    <section id="forsta-uppgifter" className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
      <SectionHeader eyebrow={t("homeEyebrow")} heading={t("homeHeading")} link={{ href: "/micro-tasks", label: t("seeAll") }} accent={ACCENTS.tasks} />
      {/* Same row as the start page's projects: five across, swipeable on phones. */}
      <div className={`${SWIPE_ROW} ${ACCENT_CARDS} sm:grid-cols-2 lg:grid-cols-5`} style={accentStyle(ACCENTS.tasks)}>
        {tasks.map((task) => (
          <div key={task.id} className={`flex ${SWIPE_ITEM}`}>
            <FirstTaskCard task={task} />
          </div>
        ))}
      </div>
    </section>
  );
}
