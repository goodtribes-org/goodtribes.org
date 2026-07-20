import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import KudosButton from "@/components/KudosButton";
import MessageButton from "@/components/MessageButton";
import ShareButton from "@/components/ShareButton";
import FlagContentButton from "@/components/FlagContentButton";
import { isLeadRole } from "@/lib/authz";
import { PROJECT_PHASE_LABEL as PHASE_LABELS } from "@/lib/projectPhase";
import { buildMetadata, APP_URL } from "@/lib/metadata";

export const dynamic = "force-dynamic";


const SOCIAL_LABELS: Record<string, string> = {
  website: "Website",
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
  const member = await prisma.user.findFirst({
    where: { id, showProfile: true },
    select: { name: true, bio: true, image: true },
  });
  if (!member) return {};
  return buildMetadata({
    locale,
    path: `/members/${id}`,
    title: member.name ?? "Medlem",
    description: member.bio ?? "En medlem på GoodTribes.org",
    imageUrl: member.image,
  });
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();

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
      projectMemberships: {
        where: { project: { visibility: "public" } },
        select: {
          role: true,
          project: {
            select: { slug: true, title: true, phase: true, description: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!member) notFound();

  const social = (member.socialLinks ?? {}) as Record<string, string>;
  const initials = member.name!
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const skills = member.skills.map((us) => us.skill);
  const projects = member.projectMemberships.map((pm) => ({ ...pm.project, role: pm.role }));

  return (
    <div className="max-w-2xl">
      <Link
        href="/members"
        className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
      >
        ← Back to members
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
                title={member.name ?? "Medlem"}
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
                toUserName={member.name ?? "denna person"}
              />
              <KudosButton
                toUserId={id}
                toUserName={member.name ?? "denna person"}
              />
            </div>
          )}
        </div>
      </div>

      {member.bio && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">
            About
          </h2>
          <p className="text-dark-slate">{member.bio}</p>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Skills
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
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Projects
          </h2>
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="flex items-start justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-dark-slate truncate">{project.title}</p>
                    <span className="text-xs bg-dry-sage text-dark-slate/60 px-2 py-0.5 rounded capitalize flex-shrink-0">
                      {PHASE_LABELS[project.phase] ?? project.phase}
                    </span>
                    {isLeadRole(project.role) && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-coral flex-shrink-0">
                        {project.role}
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-dark-slate/60 line-clamp-2">{project.description}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {Object.keys(social).length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Links
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
