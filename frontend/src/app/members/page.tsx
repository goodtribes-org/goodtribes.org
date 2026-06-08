import type { Metadata } from "next";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Medlemmar — GoodTribes.org",
  description: "Medlemmar i GoodTribes-nätverket",
};

export default async function MembersPage() {
  const members = await prisma.user.findMany({
    where: { showProfile: true, name: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      bio: true,
      skills: {
        select: { skill: { select: { name: true, tag: true } } },
        take: 3,
      },
    },
  });

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Medlemmar</h1>
        <p className="text-lg text-dark-slate/70">
          Personer i GoodTribes-nätverket som valt att synas.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="text-muted-teal italic">Inga medlemmar har valt att visa sin profil ännu.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.map((member) => {
            const initials = member.name!
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="border border-muted-teal rounded-lg p-6 flex gap-4 hover:border-seagrass transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-lg font-semibold text-dark-slate">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{member.name}</h2>
                  {member.bio && (
                    <p className="text-sm text-dark-slate/70 mt-1 line-clamp-2">{member.bio}</p>
                  )}
                  {member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.skills.map(({ skill }) => (
                        <span
                          key={skill.name}
                          className="text-xs bg-dry-sage text-dark-slate px-2 py-0.5 rounded-full"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
