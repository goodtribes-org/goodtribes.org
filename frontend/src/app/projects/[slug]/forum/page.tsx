export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

const prisma = new PrismaClient();

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

const CATEGORY_LABELS: Record<string, string> = {
  general: "Allmänt",
  decision: "Beslut",
  question: "Fråga",
  update: "Uppdatering",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  decision: "bg-blue-100 text-blue-700",
  question: "bg-yellow-100 text-yellow-700",
  update: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Öppen",
  resolved: "Löst",
  decided: "Beslutad",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-gray-100 text-gray-600",
  resolved: "bg-green-100 text-green-700",
  decided: "bg-blue-100 text-blue-700",
};

const FILTER_TABS = [
  { key: "all", label: "Alla" },
  { key: "open", label: "Öppna" },
  { key: "decided", label: "Beslutade" },
  { key: "resolved", label: "Lösta" },
];

export default async function ForumPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { slug } = await params;
  const { filter } = await searchParams;
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project) notFound();

  const statusFilter = filter && filter !== "all" ? filter : undefined;

  const posts = await prisma.forumPost.findMany({
    where: {
      projectSlug: slug,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      author: { select: { name: true, image: true } },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  const activeFilter = filter ?? "all";

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
          <h1 className="text-2xl font-bold mt-1">Diskussionsforum</h1>
        </div>
        {session && (
          <Link
            href={`/projects/${slug}/forum/new`}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            + Nytt inlägg
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-muted-teal">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/projects/${slug}/forum${tab.key !== "all" ? `?filter=${tab.key}` : ""}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeFilter === tab.key
                ? "bg-white border border-b-white border-muted-teal text-seagrass -mb-px"
                : "text-dark-slate/60 hover:text-dark-slate"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
          <p className="text-dark-slate/50">Inga diskussioner ännu.</p>
          {session && (
            <Link
              href={`/projects/${slug}/forum/new`}
              className="text-seagrass hover:underline text-sm mt-2 inline-block"
            >
              Starta den första! →
            </Link>
          )}
          {!session && (
            <p className="text-dark-slate/40 text-sm mt-2">Starta den första!</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/projects/${slug}/forum/${post.id}`}
              className="block border border-muted-teal rounded-lg p-4 hover:border-seagrass hover:bg-white/50 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Left: badges + title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {post.pinned && (
                      <span className="text-xs font-semibold text-coral bg-coral/10 px-2 py-0.5 rounded-full">
                        Fäst
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.general
                      }`}
                    >
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-dark-slate group-hover:text-seagrass truncate">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-dark-slate/50">
                    {post.author.image && (
                      <img
                        src={post.author.image}
                        alt=""
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span>{post.author.name ?? "Okänd"}</span>
                    <span>·</span>
                    <span>{timeAgo(post.createdAt)}</span>
                  </div>
                </div>

                {/* Right: reply count + status */}
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <span className="text-xs text-dark-slate/50 bg-dark-slate/5 px-2 py-0.5 rounded-full">
                    {post._count.replies} svar
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[post.status] ?? STATUS_COLORS.open
                    }`}
                  >
                    {STATUS_LABELS[post.status] ?? post.status}
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
