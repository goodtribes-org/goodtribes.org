import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";


export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();

  const [mentor, ownedProjects] = await Promise.all([
    prisma.mentor.findUnique({
      where: { userId, verified: true },
      include: {
        user: { select: { id: true, name: true, image: true, bio: true } },
        requests: {
          include: {
            feedback: { select: { rating: true, comment: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    session?.user?.id
      ? prisma.project.findMany({
          where: { ownerId: session.user.id },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!mentor) notFound();

  const user = mentor.user;
  const initials = (user.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const acceptedRequests = mentor.requests.filter((r) => r.status === "accepted" || r.status === "completed");
  const feedbacks = mentor.requests
    .filter((r) => r.feedback !== null)
    .map((r) => r.feedback!);

  const avgRating =
    feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : null;

  const bio = mentor.bio ?? user.bio ?? null;

  return (
    <div className="max-w-2xl">
      <Link
        href="/mentors"
        className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
      >
        ← Alla mentorer
      </Link>

      {/* Mentor header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-dry-sage flex-shrink-0 flex items-center justify-center text-2xl font-semibold text-dark-slate overflow-hidden">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <span className="text-sm bg-seagrass/10 text-seagrass font-medium px-2.5 py-0.5 rounded-full">
              Mentor
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-dark-slate/60">
            <span>{acceptedRequests.length} genomförda sessioner</span>
            {avgRating !== null && (
              <span>
                {avgRating.toFixed(1)} / 5 ({feedbacks.length} omdömen)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Categories */}
      {mentor.categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">Kategorier</h2>
          <div className="flex flex-wrap gap-2">
            {mentor.categories.map((cat) => (
              <span
                key={cat}
                className="bg-dry-sage text-dark-slate text-sm px-3 py-1 rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Bio */}
      {bio && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-2">Om mentorn</h2>
          <p className="text-dark-slate whitespace-pre-line">{bio}</p>
        </section>
      )}

      {/* Feedback */}
      {feedbacks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-dark-slate/60 uppercase tracking-wide mb-3">Omdömen</h2>
          <div className="flex flex-col gap-3">
            {feedbacks.map((fb, i) => (
              <div key={i} className="border border-muted-teal/40 rounded-xl p-4">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, star) => (
                    <span
                      key={star}
                      className={`text-base ${star < fb.rating ? "text-amber-400" : "text-dark-slate/20"}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {fb.comment && <p className="text-sm text-dark-slate/70 italic">&ldquo;{fb.comment}&rdquo;</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Booking form */}
      <section className="border-t border-muted-teal/40 pt-8">
        <h2 className="text-xl font-semibold mb-1">Boka mentorssession</h2>
        <p className="text-sm text-dark-slate/60 mb-5">
          Berätta om ditt projekt och vad du vill ha hjälp med. Mentorn återkommer med lediga tider.
        </p>

        {session?.user?.id ? (
          <BookingForm mentorId={mentor.id} projects={ownedProjects} />
        ) : (
          <p className="text-sm text-dark-slate/60">
            Du måste vara{" "}
            <Link href="/login" className="text-coral hover:underline">
              inloggad
            </Link>{" "}
            för att boka en mentor.
          </p>
        )}
      </section>
    </div>
  );
}
