import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import FirstTaskCard from "@/components/FirstTaskCard";
import type { FirstTaskListItem } from "@/lib/firstTasks";
import { SWIPE_ITEM, SWIPE_ROW, SectionHeader, wrap } from "./Sections";

// "Första uppgifter i drömmar som pågår" on the start page (#279), right
// under the dream box: the other way in — help someone else's dream with one
// small, concrete thing. Renders nothing while no project has opened one.
export default async function FirstTasksSection({ locale, tasks, total }: { locale: Locale; tasks: FirstTaskListItem[]; total: number }) {
  if (tasks.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "FirstTasksDiscover" });
  return (
    <section id="forsta-uppgifter" className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
      <SectionHeader eyebrow={t("eyebrow")} heading={t("heading")} intro={t("intro")} />
      {/* Same row as the start page's projects: five across, swipeable on phones. */}
      <div className={`${SWIPE_ROW} sm:grid-cols-2 lg:grid-cols-5`}>
        {tasks.map((task) => (
          <div key={task.id} className={`flex ${SWIPE_ITEM}`}>
            <FirstTaskCard task={task} />
          </div>
        ))}
      </div>
      <a href="/micro-tasks" className="self-start text-base font-bold text-[#C2410C] hover:underline">{t("seeAll", { count: total })}</a>
    </section>
  );
}
