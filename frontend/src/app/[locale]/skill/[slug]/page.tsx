import type { Metadata } from "next";
import { prisma } from "@/lib/prisma"
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECT_PHASE_LABEL } from "@/lib/projectPhase";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import ShareButton from "@/components/ShareButton";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const skill = await prisma.skill.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!skill) return { title: "Skill not found" };
  return buildMetadata({
    locale,
    path: `/skill/${slug}`,
    title: skill.name,
    description: skill.description,
  });
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const skill = await prisma.skill.findUnique({
    where: { slug },
    include: {
      users: {
        where: { user: { showProfile: true } },
        include: {
          user: { select: { id: true, name: true, bio: true } },
        },
        orderBy: { addedAt: "asc" },
      },
      projects: {
        where: { project: { visibility: "public" } },
        include: {
          project: {
            select: {
              slug: true,
              title: true,
              phase: true,
              description: true,
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!skill) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/skill" className="text-sm text-dark-slate/50 hover:text-seagrass mb-6 inline-block">
        ← All skills
      </Link>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4">
          <h1 className="text-3xl font-bold">{skill.name}</h1>
          <span className="text-sm bg-dry-sage text-dark-slate px-3 py-1 rounded-full mt-1 flex-shrink-0">
            #{skill.tag}
          </span>
        </div>
        <ShareButton url={`${APP_URL}/${locale}/skill/${slug}`} title={skill.name} variant="icon" />
      </div>

      <p className="text-dark-slate/70 mb-10">{skill.description}</p>

      {skill.projects.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-4">
            {skill.projects.length} project{skill.projects.length !== 1 ? "s" : ""} seeking this skill
          </h2>
          <div className="flex flex-col gap-3">
            {skill.projects.map(({ project }) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="flex items-start gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-dark-slate truncate">{project.title}</p>
                    <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-0.5 rounded flex-shrink-0">
                      {PROJECT_PHASE_LABEL[project.phase] ?? project.phase}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-dark-slate/60 line-clamp-2">{project.description}</p>
                  )}
                  <p className="text-xs text-dark-slate/40 mt-1">{project._count.members} member{project._count.members !== 1 ? "s" : ""}</p>
                </div>
                <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-4">
          {skill.users.length} {skill.users.length === 1 ? "person" : "people"} with this skill
        </h2>

        {skill.users.length === 0 ? (
          <p className="text-muted-teal italic text-sm">No one has added this skill yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {skill.users.map(({ user }) => {
              const initials = user.name
                ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              return (
                <li key={user.id}>
                  <Link
                    href={`/members/${user.id}`}
                    className="flex items-start gap-4 border border-muted-teal rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
                  >
                    <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center font-semibold text-dark-slate flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{user.name ?? "Unknown"}</p>
                      {user.bio && (
                        <p className="text-sm text-dark-slate/60 mt-1 line-clamp-2">{user.bio}</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
