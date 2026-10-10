import { PUBLIC_PROJECT_WHERE } from "@/lib/projectVisibility";
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import KudosButton from "@/components/KudosButton";
import MessageButton from "@/components/MessageButton";
import ShareButton from "@/components/ShareButton";
import FlagContentButton from "@/components/FlagContentButton";
import { getTranslations } from "next-intl/server";
import { getContributions } from "@/lib/contributions";
import { buildMetadata, APP_URL } from "@/lib/metadata";

export const dynamic = "force-dynamic";


const SOCIAL_LABELS_STATIC: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter / X",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "MemberProfilePage" });
  const member = await prisma.user.findFirst({
    where: { id, showProfile: true },
    select: { name: true, bio: true, image: true },
  });
  if (!member) return {};
  return buildMetadata({
    locale,
    path: `/members/${id}`,
    title: member.name ?? t("fallbackTitle"),
    description: member.bio ?? t("fallbackDescription"),
    imageUrl: member.image,
  });
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tPhase = await getTranslations({ locale, namespace: "ProjectPhase" });
  const t = await getTranslations("MemberProfilePage");
  const session = await auth();
  const SOCIAL_LABELS: Record<string, string> = {
    website: t("website"),
    ...SOCIAL_LABELS_STATIC,
  };

  const member = await prisma.user.findFirst({
    where: { id, showProfile: true },
    select: {
      name: true,
      bio: true,
      image: true,
      socialLinks: true,
      skills: {
        select: { skill: { select: { id: true, name: true, tag: true, slug: true } } },
      },
    },
  });

  if (!member) notFound();

  // #237: shared ideas and how many of them someone drives. No ranking.
  const [ideasShared, ideasDriven, contributions] = await Promise.all([
    prisma.idea.count({ where: { authorId: id, hiddenAt: null, status: "open" } }),
    prisma.idea.count({ where: { authorId: id, hiddenAt: null, status: "open", basedProjects: { some: PUBLIC_PROJECT_WHERE } } }),
    getContributions(id),
  ]);

  const social = (member.socialLinks ?? {}) as Record<string, string>;
  const initials = member.name!
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const skills = member.skills.map((us) => us.skill);
  const { projects, tasksDone, thanks } = contributions;
  const isSelf = session?.user?.id === id;
  const monthYear = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { month: "long", year: "numeric" });
  const summary = [
    t("contributionsSummary", { tasks: tasksDone, projects: projects.length }),
    thanks.count > 0 ? t("thanksCount", { count: thanks.count }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="max-w-2xl">
      <Link
        href="/members"
        className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
      >
        ← {t("backToMembers")}
      </Link>

      <div className="flex items-start gap-6 mb-8">
        {member.image ? (
          <img
            src={member.image}
            alt={member.name ?? ""}
            className="w-20 h-20 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-dry-sage flex items-center justify-center text-2xl font-semibold text-dark-slate flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold mb-1">{member.name}</h1>
            <div className="flex items-center gap-3">
              <ShareButton
                url={`${APP_URL}/${locale}/members/${id}`}
                title={member.name ?? t("fallbackTitle")}
                variant="icon"
              />
              {session?.user?.id && session.user.id !== id && (
                <FlagContentButton targetType="User" targetId={id} />
              )}
            </div>
          </div>
          {session?.user?.id && session.user.id !== id && (
            <div className="mt-2 flex gap-2">
              <MessageButton
                toUserId={id}
                toUserName={member.name ?? t("thisPerson")}
              />
              <KudosButton
                toUserId={id}
                toUserName={member.name ?? t("thisPerson")}
              />
              <Link
                href={`/granskningsradet/anmal?userId=${id}`}
                className="text-xs text-dark-slate/40 hover:text-watermelon self-center"
              >
                {t("reportToReviewCouncil")}
              </Link>
            </div>
          )}
        </div>
      </div>

      {ideasShared > 0 && (
        <p className="mb-6 inline-block rounded-full bg-coral/10 px-3 py-1 text-sm font-medium text-coral">
          {t("ideaGiver", { shared: ideasShared, driven: ideasDriven })}
        </p>
      )}

      {member.bio && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">
            {t("aboutHeading")}
          </h2>
          <p className="text-dark-slate">{member.bio}</p>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            {t("skillsHeading")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skill/${skill.slug}`}
                className="bg-dry-sage text-dark-slate text-sm px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
              >
                {skill.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section id="bidrag" className="mb-8 scroll-mt-24">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide">
              {t("contributionsHeading")}
            </h2>
            {isSelf && (
              <ShareButton
                url={`${APP_URL}/${locale}/members/${id}#bidrag`}
                title={t("meritTitle", { name: member.name ?? t("fallbackTitle") })}
                text={summary}
                variant="icon"
              />
            )}
          </div>
          <p className="mb-3 text-sm font-semibold text-dark-slate">{summary}</p>
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="block border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-dark-slate">{project.title}</p>
                  <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-0.5 rounded">
                    {tPhase(project.phase)}
                  </span>
                  {project.verifiedImpact > 0 && (
                    <span className="text-xs font-semibold text-seagrass">{t("verifiedImpact")}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-dark-slate/60">
                  <span className="font-semibold text-coral">{t(`role.${project.role ?? "HELPER"}`)}</span>
                  {" · "}{t("since", { date: monthYear(project.since) })}
                  {" · "}{project.tasksDone > 0 ? t("tasksDone", { count: project.tasksDone }) : t("noTasksYet")}
                  {project.subtasksDone > 0 && ` + ${t("subtasksDone", { count: project.subtasksDone })}`}
                </p>
                {project.recentTasks.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm text-dark-slate/80">
                    {project.recentTasks.map((title, i) => (
                      <li key={i} className="flex gap-2"><span className="text-seagrass">✓</span><span className="min-w-0 truncate">{title}</span></li>
                    ))}
                  </ul>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {thanks.recent.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            {t("thanksHeading")}
          </h2>
          <ul className="flex flex-col gap-3">
            {thanks.recent.map((k, i) => (
              <li key={i} className="rounded-lg border-l-4 border-coral/40 bg-white px-4 py-3">
                <p className="text-sm text-dark-slate">&ldquo;{k.message}&rdquo;</p>
                {(k.from || k.project) && (
                  <p className="mt-1 text-xs text-dark-slate/50">
                    – {[k.from, k.project].filter(Boolean).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {Object.keys(social).length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            {t("linksHeading")}
          </h2>
          <ul className="flex flex-col gap-2">
            {Object.entries(social).map(([key, value]) => (
              <li key={key} className="flex items-center gap-2">
                <span className="text-xs text-dark-slate/50 w-24 flex-shrink-0">
                  {SOCIAL_LABELS[key] ?? key}
                </span>
                <a
                  href={key === "website" ? value : `https://${value.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-coral hover:text-seagrass underline underline-offset-4 truncate"
                >
                  {value}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
