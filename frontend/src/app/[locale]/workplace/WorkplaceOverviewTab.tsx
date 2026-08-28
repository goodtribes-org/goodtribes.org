import Link from "next/link";
import { PROJECT_PHASE_LABEL as PHASE_LABEL, PROJECT_PHASE_COLOR as PHASE_COLOR } from "@/lib/projectPhase";
import { resolveProjectContent, resolveIdeaContent } from "@/lib/contentTranslation";
import type { Locale } from "next-intl";
import { roleLabel, formatDue, isDueSoon, type T } from "./workplaceHelpers";

type ProjectTranslationRow = { locale: string; title: string; summary: string | null; description: string | null };
type IdeaTranslationRow = { locale: string; title: string; description: string | null; problem: string | null; solution: string | null };

type Membership = {
  role: string;
  project: {
    id: string;
    title: string;
    slug: string;
    phase: string;
    summary: string | null;
    description: string | null;
    translations: ProjectTranslationRow[] | false;
    _count: { kanbanCards: number; members: number };
  };
};

type OpenTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  project: { title: string; slug: string };
};

type MyIdea = {
  id: string;
  title: string;
  description: string | null;
  problem: string | null;
  solution: string | null;
  translations: IdeaTranslationRow[] | false;
  _count: { votes: number; comments: number };
};

export default function WorkplaceOverviewTab({
  t,
  locale,
  memberships,
  allTasks,
  myIdeas,
}: {
  t: T;
  locale: string;
  memberships: Membership[];
  allTasks: OpenTask[];
  myIdeas: MyIdea[];
}) {
  return (
    <div className="space-y-12">
      {/* My Projects */}
      <section data-tour="workplace-projects">
        <h2 className="text-xl font-semibold mb-4">{t("myProjectsHeading")}</h2>
        {memberships.length === 0 ? (
          <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
            <p className="text-dark-slate/50 mb-3">{t("noProjectsYet")}</p>
            <Link href="/projects" className="text-seagrass hover:underline text-sm">
              {t("exploreProjects")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map(({ role, project }) => {
              const content = resolveProjectContent(project, project.translations, locale as Locale);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="border border-muted-teal rounded-lg p-5 hover:border-seagrass hover:shadow-sm transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-dark-slate leading-tight">{content.title}</h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${PHASE_COLOR[project.phase] ?? PHASE_COLOR.IDEA}`}
                    >
                      {PHASE_LABEL[project.phase] ?? project.phase}
                    </span>
                  </div>
                  {(content.summary ?? content.description) && (
                    <p className="text-sm text-dark-slate/60 line-clamp-2">{content.summary ?? content.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-dark-slate/50 mt-auto pt-1 border-t border-muted-teal/40">
                    <span className="font-medium text-seagrass">{roleLabel(t, role)}</span>
                    <span>{t("kanbanCount", { count: project._count.kanbanCards })}</span>
                    <span>{t("membersCount", { count: project._count.members })}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Open Tasks */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("openTasksHeading")}</h2>
        {allTasks.length === 0 ? (
          <p className="text-dark-slate/50 italic text-sm">{t("noOpenTasks")}</p>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {allTasks.map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.project.slug}/tasks`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider w-12 flex-shrink-0 text-coral">
                  {t("boardBadge")}
                </span>
                <span className="flex-1 text-sm text-dark-slate truncate">{task.title}</span>
                <span className="text-xs text-dark-slate/40 flex-shrink-0">
                  {task.project.title}
                </span>
                {task.dueDate && (
                  <span
                    className={`text-xs flex-shrink-0 font-medium ${
                      isDueSoon(task.dueDate) ? "text-coral" : "text-dark-slate/40"
                    }`}
                  >
                    {formatDue(t, task.dueDate)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Ideas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("myIdeasHeading")}</h2>
          <Link href="/ideas/new" className="text-seagrass hover:underline text-sm">
            {t("shareIdeaLink")}
          </Link>
        </div>
        {myIdeas.length === 0 ? (
          <p className="text-dark-slate/50 italic text-sm">
            {t("noIdeasYet")}{" "}
            <Link href="/ideas" className="text-seagrass hover:underline">
              {t("browseIdeaFeed")}
            </Link>
          </p>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {myIdeas.map((idea) => {
              const ideaContent = resolveIdeaContent(idea, idea.translations, locale as Locale);
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
                >
                  <span className="flex-1 text-sm text-dark-slate">{ideaContent.title}</span>
                  <span className="text-xs text-dark-slate/40 flex-shrink-0">
                    {t("votesCount", { count: idea._count.votes })} &nbsp;·&nbsp;{" "}
                    {t("commentsCount", { count: idea._count.comments })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
