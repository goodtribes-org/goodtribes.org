export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation";
import Link from "next/link";


function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just nu";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d sedan`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_LABELS: Record<string, string> = {
  yes_no: "Ja/Nej",
  multiple: "Flerval",
  ranked: "Rangordning",
};

export default async function PollsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const polls = await prisma.poll.findMany({
    where: { projectSlug: slug },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { votes: true, options: true } },
    },
    orderBy: [
      { status: "asc" }, // open < closed alphabetically
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/projects/${slug}`}
            className="text-sm text-dark-slate/50 hover:text-seagrass"
          >
            ← {project.title}
          </Link>
          <h1 className="text-2xl font-bold mt-1">Omröstningar</h1>
        </div>
        {session && (
          <Link
            href={`/projects/${slug}/polls/new`}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            + Ny omröstning
          </Link>
        )}
      </div>

      {/* Poll list */}
      {polls.length === 0 ? (
        <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
          <p className="text-dark-slate/50">Inga omröstningar ännu.</p>
          {session && (
            <Link
              href={`/projects/${slug}/polls/new`}
              className="text-seagrass hover:underline text-sm mt-2 inline-block"
            >
              Skapa den första! →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {polls.map((poll) => (
            <Link
              key={poll.id}
              href={`/projects/${slug}/polls/${poll.id}`}
              className="block border border-muted-teal rounded-lg p-4 hover:border-seagrass hover:bg-white/50 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Left: badges + title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {/* Status badge */}
                    {poll.status === "open" ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Öppen
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Avslutad
                      </span>
                    )}
                    {/* Binding badge */}
                    {poll.isBinding && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Bindande
                      </span>
                    )}
                    {/* Type label */}
                    <span className="text-xs text-dark-slate/50">
                      {TYPE_LABELS[poll.type] ?? poll.type}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-dark-slate group-hover:text-seagrass truncate">
                    {poll.title}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-dark-slate/50 flex-wrap">
                    <span>{poll.createdBy.name ?? "Okänd"}</span>
                    <span>·</span>
                    <span>{timeAgo(poll.createdAt)}</span>
                    {poll.deadline && poll.status === "open" && (
                      <>
                        <span>·</span>
                        <span>
                          Stänger{" "}
                          {poll.deadline.toLocaleDateString("sv-SE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: vote count */}
                <div className="shrink-0 mt-1">
                  <span className="text-xs text-dark-slate/50 bg-dark-slate/5 px-2 py-0.5 rounded-full">
                    {poll._count.votes} röst{poll._count.votes !== 1 ? "er" : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
