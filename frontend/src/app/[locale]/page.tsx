export const dynamic = "force-dynamic";

import ChallengeCard from "@/components/challenges/ChallengeCard";
import FundingCallCard from "@/components/fundingCalls/FundingCallCard";
import Link from "next/link";
import { hasLocale, type Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import ProjectCard from "@/components/ProjectCard";
import Community from "@/components/ny-startsida/Community";
import FoundingCard from "@/components/ny-startsida/FoundingCard";
import DreamHero from "@/components/ny-startsida/DreamHero";
import FirstTasksSection from "@/components/ny-startsida/FirstTasksSection";
import IdeaCard from "@/components/ny-startsida/IdeaCard";
import DiscoverTabs from "@/components/ny-startsida/DiscoverTabs";
import { getHomePageData } from "@/components/ny-startsida/homeData";
import {
  H2, INK, LiveStrip, PhaseJourney, PlatformStats, SectionHeader, SWIPE_ITEM, SWIPE_ROW, wrap,
} from "@/components/ny-startsida/Sections";
import { newHomeBodyFont } from "@/components/ny-startsida/fonts";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = await getTranslations({ locale, namespace: "NewHomePage" });
  const {
    userId, projects, ideas, ideaLabels, events, communityEvents, thanks, phases,
    openCalls, openChallenges, firstTasks, memberCount, newMembers, allProjects,
    totalRaised, completedTasks, totalTokens,
  } = await getHomePageData(locale);

  return (
    // Full-bleed, so the page's own grey background runs edge to edge inside
    // the site layout's content column.
    <div
      className={`${newHomeBodyFont.className} -mt-8`}
      style={{
        marginLeft: "calc(50% - 50vw)",
        width: "100vw",
        background: "#FCFCFB",
        color: INK,
        ["--nh-accent" as string]: "#E8531F",
      }}
    >
      {/* 100vw includes the scrollbar, so the full-bleed wrapper is a few
          pixels wider than the page; clip that instead of letting it scroll. */}
      <style>{`html, body { overflow-x: clip; }`}</style>
      <DreamHero />
      {/* Other ways in: Drömguiden from its first question (the dream box
          above answers that one for you), or help out. */}
      <div className="-mt-6 flex flex-wrap justify-center gap-2 px-4 pb-6">
        <Link
          href="/projects/new"
          className="inline-flex items-center rounded-full border border-[#E8531F] bg-white px-4 py-2 text-[15px] font-semibold hover:bg-[#FFF4EE]"
          style={{ color: INK }}
        >
          {t("hero.startProject")}
        </Link>
        <Link
          href={firstTasks.total > 0 ? "/micro-tasks" : "/projects"}
          className="inline-flex items-center rounded-full border border-[#E4E4DF] bg-white px-4 py-2 text-[15px] font-semibold hover:border-[#C2410C]"
          style={{ color: INK }}
        >
          {firstTasks.total > 0 ? t("hero.helpFirstTask") : t("hero.helpInstead")}
        </Link>
      </div>
      {/* Who runs the platform, said once near the top (Niklas, 2026-10-09). */}
      <p className="m-0 -mt-2 px-4 pb-6 text-center text-[15px]" style={{ color: INK }}>
        {t("hero.foundation")}
      </p>
      <LiveStrip locale={locale} items={events.slice(0, 8).map((a) => ({ project: a.projectName, action: a.action }))} />

      <FoundingCard locale={locale} />

      {projects.length > 0 && (
        <section id="projekt" className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
          <SectionHeader eyebrow={t("projects.eyebrow")} heading={t("projects.heading")} link={{ href: "/projects", label: t("projects.allLink") }} />
          <div className={`${SWIPE_ROW} sm:grid-cols-2 lg:grid-cols-5`}>
            {projects.map((p) => (
              <div key={p.slug} className={`flex ${SWIPE_ITEM}`}>
                <ProjectCard project={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {(ideas.length > 0 || openCalls.length > 0 || openChallenges.length > 0) && (
        <section id="hitta" className={`${wrap} flex flex-col gap-6 pt-[48px]`}>
          <DiscoverTabs
            eyebrow={t("discover.eyebrow")}
            heading={<H2 className="max-w-[720px]">{t("discover.heading")}</H2>}
            tabsLabel={t("discover.tabsLabel")}
            tabs={[
              ideas.length > 0 && {
                key: "ideer",
                label: t("ideas.eyebrow"),
                allLink: { href: "/ideas", label: t("ideas.allLink") },
                content: (
                  <div className={`${SWIPE_ROW} sm:grid-cols-2 lg:grid-cols-5`}>
                    {ideas.map((idea) => (
                      <div key={idea.id} className={`flex ${SWIPE_ITEM}`}>
                        <IdeaCard idea={idea} labels={ideaLabels} />
                      </div>
                    ))}
                  </div>
                ),
              },
              openCalls.length > 0 && {
                key: "utlysningar",
                label: t("fundingCalls.eyebrow"),
                allLink: { href: "/utlysningar", label: t("fundingCalls.allLink") },
                content: (
                  <div className={`${SWIPE_ROW} sm:grid-cols-2 lg:grid-cols-5`}>
                    {openCalls.map((c) => (
                      <div key={c.slug} className={`flex ${SWIPE_ITEM}`}>
                        <FundingCallCard call={c} />
                      </div>
                    ))}
                  </div>
                ),
              },
              openChallenges.length > 0 && {
                key: "utmaningar",
                label: t("challenges.eyebrow"),
                allLink: { href: "/challenges", label: t("challenges.allLink") },
                content: (
                  <div className={`${SWIPE_ROW} sm:grid-cols-2 lg:grid-cols-3`}>
                    {openChallenges.map((c) => (
                      <div key={c.slug} className={`flex ${SWIPE_ITEM}`}>
                        <ChallengeCard challenge={c} locale={locale} />
                      </div>
                    ))}
                  </div>
                ),
              },
            ].filter((tab) => tab !== false)}
          />
        </section>
      )}

      <FirstTasksSection locale={locale} tasks={firstTasks.items} />

      <PhaseJourney locale={locale} phases={phases} />

      <Community
        locale={locale}
        memberCount={memberCount}
        newestMembers={newMembers}
        events={communityEvents}
        viewerId={userId ?? null}
        thanks={thanks}
      />

      <PlatformStats
        locale={locale}
        totalRaised={totalRaised}
        completedTasks={completedTasks}
        totalTokens={totalTokens}
        activeProjects={allProjects.length}
      />

      <div className="pb-24" />
    </div>
  );
}
