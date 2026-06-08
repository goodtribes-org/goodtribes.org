import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Kompetenser — GoodTribes.org",
  description: "Se vilka kompetenser som finns hos GoodTribes-gemenskapen.",
};

export default async function SkillListPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      tag: true,
      description: true,
      slug: true,
      _count: { select: { users: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">Kompetenser</h1>
          <p className="text-lg text-dark-slate/70">
            Vad kan gemenskapens medlemmar? Hitta rätt person för ditt projekt.
          </p>
        </div>
        {userId && (
          <Link
            href="/profile"
            className="flex-shrink-0 bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            + Lägg till kompetens
          </Link>
        )}
      </div>

      {skills.length === 0 ? (
        <p className="text-muted-teal italic">Inga kompetenser ännu — lägg till dina egna på din profil!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/skill/${skill.slug}`}
              className="border border-muted-teal rounded-lg p-6 hover:border-seagrass transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-lg font-semibold">{skill.name}</h2>
                <span className="text-xs bg-dry-sage text-dark-slate px-2 py-0.5 rounded-full flex-shrink-0">
                  #{skill.tag}
                </span>
              </div>
              <p className="text-sm text-dark-slate/70 line-clamp-2 mb-3">{skill.description}</p>
              <p className="text-xs text-muted-teal">
                {skill._count.users} {skill._count.users === 1 ? "person" : "personer"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
