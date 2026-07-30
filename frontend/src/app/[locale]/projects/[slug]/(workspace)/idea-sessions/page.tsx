export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createProjectIdeaThread } from "@/app/[locale]/ideaverkstad/actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Idéverkstad — GoodTribes.org` };
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just nu";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} tim sedan`;
  return `${Math.floor(h / 24)} dagar sedan`;
}

export default async function ProjectIdeaSessionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const rooms = await prisma.room.findMany({
    where: { type: "IDEA_THREAD", projectId: project.id },
    orderBy: { lastMessageAt: "desc" },
    include: { _count: { select: { participants: true, messages: true } } },
  });

  async function startIdeaSession() {
    "use server";
    if (!session?.user?.id) redirect("/login");
    const { roomId } = await createProjectIdeaThread(project!.id);
    redirect(`/ideaverkstad/${roomId}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
            ← {project.title}
          </Link>
          <h1 className="text-xl font-bold text-dark-slate mt-0.5">Idéverkstad</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            Bolla nya angreppssätt med projektets medlemmar — skriv @AI för att bjuda in AI, som har tillgång till
            projektets beskrivning, milstolpar, uppgifter och wiki.
          </p>
        </div>
        <form action={startIdeaSession}>
          <button
            type="submit"
            className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
          >
            + Starta idésession
          </button>
        </form>
      </div>

      {rooms.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-16 text-center">
          <p className="text-dark-slate/40 text-sm">Inga idésessioner ännu för det här projektet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/ideaverkstad/${room.id}`}
              className="flex items-center justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="min-w-0">
                <p className="font-medium text-dark-slate truncate">{room.name ?? "Namnlös idésession"}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {room._count.participants} deltagare · {room._count.messages} inlägg · senast aktiv {timeAgo(room.lastMessageAt)}
                </p>
              </div>
              <svg className="w-4 h-4 text-dark-slate/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
