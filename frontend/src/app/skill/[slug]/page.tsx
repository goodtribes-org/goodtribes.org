import type { Metadata } from "next";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = await prisma.skill.findUnique({ where: { slug }, select: { name: true } });
  if (!skill) return { title: "Kompetens hittades inte" };
  return { title: `${skill.name} — GoodTribes.org` };
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const skill = await prisma.skill.findUnique({
    where: { slug },
    include: {
      users: {
        include: {
          user: { select: { id: true, name: true, bio: true } },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!skill) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/skill" className="text-sm text-dark-slate/50 hover:text-seagrass mb-6 inline-block">
        ← Alla kompetenser
      </Link>

      <div className="flex items-start gap-4 mb-4">
        <h1 className="text-3xl font-bold">{skill.name}</h1>
        <span className="text-sm bg-dry-sage text-dark-slate px-3 py-1 rounded-full mt-1 flex-shrink-0">
          #{skill.tag}
        </span>
      </div>

      <p className="text-dark-slate/70 mb-10">{skill.description}</p>

      <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-4">
        {skill.users.length} {skill.users.length === 1 ? "person" : "personer"} med denna kompetens
      </h2>

      {skill.users.length === 0 ? (
        <p className="text-muted-teal italic text-sm">Ingen har lagt till denna kompetens ännu.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {skill.users.map(({ user }) => {
            const initials = user.name
              ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
              : "?";
            return (
              <li key={user.id} className="flex items-start gap-4 border border-muted-teal rounded-lg p-4">
                <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center font-semibold text-dark-slate flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{user.name ?? "Namnlös"}</p>
                  {user.bio && (
                    <p className="text-sm text-dark-slate/60 mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
