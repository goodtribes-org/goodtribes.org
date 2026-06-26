import type { Metadata } from "next";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Mentorer — GoodTribes.org",
  description: "Hitta en mentor inom GoodTribes-nätverket",
};

export default async function MentorsPage() {
  const session = await auth();

  const [mentors, existingMentor] = await Promise.all([
    prisma.mentor.findMany({
      where: { verified: true },
      include: {
        user: { select: { id: true, name: true, image: true, bio: true } },
        requests: { where: { status: "accepted" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    session?.user?.id
      ? prisma.mentor.findUnique({ where: { userId: session.user.id }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const showApplyButton = session?.user?.id && !existingMentor;

  return (
    <div>
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">Mentorer</h1>
          <p className="text-lg text-dark-slate/70">
            Erfarna personer som hjälper projekt att växa. Boka en session och ta ditt projekt till nästa nivå.
          </p>
        </div>
        {showApplyButton && (
          <Link
            href="/mentors/apply"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors whitespace-nowrap"
          >
            Bli mentor →
          </Link>
        )}
      </div>

      {mentors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-2">Inga verifierade mentorer ännu.</p>
          {showApplyButton && (
            <Link href="/mentors/apply" className="text-sm text-coral hover:underline mt-2">
              Ansök om att bli den första →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mentors.map((mentor) => {
            const user = mentor.user;
            const initials = (user.name ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const sessionCount = mentor.requests.length;
            const bioPreview = (mentor.bio ?? user.bio ?? "").slice(0, 100);

            return (
              <div
                key={mentor.id}
                className="border border-muted-teal rounded-lg p-6 flex flex-col gap-4 hover:border-seagrass transition-colors"
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-lg font-semibold text-dark-slate overflow-hidden">
                    {user.image ? (
                      <img src={user.image} alt={user.name ?? ""} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold">{user.name}</h2>
                      <span className="text-xs bg-seagrass/10 text-seagrass font-medium px-2 py-0.5 rounded-full">
                        Mentor
                      </span>
                    </div>
                    <p className="text-xs text-dark-slate/50 mt-0.5">
                      {sessionCount} genomf{sessionCount === 1 ? "ord" : "örda"} session{sessionCount !== 1 ? "er" : ""}
                    </p>
                  </div>
                </div>

                {/* Categories */}
                {mentor.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs bg-dry-sage text-dark-slate px-2.5 py-0.5 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio snippet */}
                {bioPreview && (
                  <p className="text-sm text-dark-slate/70">
                    {bioPreview}
                    {(mentor.bio ?? user.bio ?? "").length > 100 ? "…" : ""}
                  </p>
                )}

                {/* CTA */}
                <Link
                  href={`/mentors/${user.id}`}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-coral hover:text-watermelon transition-colors"
                >
                  Boka mentor →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
