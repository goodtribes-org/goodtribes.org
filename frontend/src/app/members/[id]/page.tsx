import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

const SOCIAL_LABELS: Record<string, string> = {
  website: "Webbplats",
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter / X",
};

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const member = await prisma.user.findFirst({
    where: { id, showProfile: true },
    select: {
      name: true,
      bio: true,
      socialLinks: true,
      skills: {
        select: { skill: { select: { id: true, name: true, tag: true, slug: true } } },
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

  return (
    <div className="max-w-2xl">
      <Link
        href="/members"
        className="text-sm text-coral hover:text-seagrass underline underline-offset-4 mb-8 inline-block"
      >
        ← Tillbaka till Medlemmar
      </Link>

      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-dry-sage flex items-center justify-center text-2xl font-semibold text-dark-slate flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-1">{member.name}</h1>
        </div>
      </div>

      {member.bio && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">
            Om mig
          </h2>
          <p className="text-dark-slate">{member.bio}</p>
        </section>
      )}

      {skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Kompetenser
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skill/${skill.slug}`}
                className="bg-dry-sage text-dark-slate text-sm px-3 py-1 rounded-full hover:bg-muted-teal/30 transition-colors"
              >
                {skill.name} <span className="text-dark-slate/50">#{skill.tag}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {Object.keys(social).length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">
            Sociala medier
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
