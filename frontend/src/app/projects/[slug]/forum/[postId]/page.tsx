export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReplyForm from "./ReplyForm";
import StatusActions from "./StatusActions";

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

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const session = await auth();

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      replies: {
        where: { parentId: null },
        include: {
          author: { select: { name: true, image: true } },
          children: {
            include: {
              author: { select: { name: true, image: true } },
              children: {
                include: {
                  author: { select: { name: true, image: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post || post.projectSlug !== slug) notFound();

  // Check if current user is owner or admin of the project
  let canManageStatus = false;
  if (session?.user?.id) {
    const project = await prisma.project.findUnique({
      where: { slug },
      include: { members: { where: { userId: session.user.id } } },
    });
    if (project) {
      const role = project.members[0]?.role;
      canManageStatus =
        project.ownerId === session.user.id ||
        (!!role && ["owner", "admin"].includes(role));
    }
  }

  const totalReplies = post.replies.reduce(
    (acc, r) => acc + 1 + (r.children?.length ?? 0) + (r.children?.reduce((a, c) => a + (c.children?.length ?? 0), 0) ?? 0),
    0,
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href={`/projects/${slug}/forum`}
        className="text-sm text-dark-slate/50 hover:text-seagrass inline-block mb-6"
      >
        ← Tillbaka till forum
      </Link>

      {/* Post */}
      <article className="border border-muted-teal rounded-lg p-6 mb-6">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
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
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              STATUS_COLORS[post.status] ?? STATUS_COLORS.open
            }`}
          >
            {STATUS_LABELS[post.status] ?? post.status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-dark-slate mb-3">{post.title}</h1>

        {/* Author + date */}
        <div className="flex items-center gap-2 text-sm text-dark-slate/50 mb-5">
          {post.author.image && (
            <img src={post.author.image} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span>{post.author.name ?? "Okänd"}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        {/* Body */}
        <div className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
          {post.body}
        </div>

        {/* Status actions */}
        {canManageStatus && (
          <div className="mt-5 pt-4 border-t border-muted-teal">
            <StatusActions
              postId={post.id}
              currentStatus={post.status}
              projectSlug={slug}
            />
          </div>
        )}
      </article>

      {/* Replies divider */}
      {totalReplies > 0 && (
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-muted-teal" />
          <span className="text-sm text-dark-slate/50">{totalReplies} svar</span>
          <div className="flex-1 h-px bg-muted-teal" />
        </div>
      )}

      {/* Replies */}
      {post.replies.length > 0 && (
        <div className="space-y-4 mb-8">
          {post.replies.map((reply) => (
            <div key={reply.id}>
              <div className="border border-muted-teal rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs text-dark-slate/50 mb-2">
                  {reply.author.image && (
                    <img src={reply.author.image} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="font-medium text-dark-slate/70">
                    {reply.author.name ?? "Okänd"}
                  </span>
                  <span>·</span>
                  <span>{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed">
                  {reply.body}
                </p>
              </div>

              {/* Level 2 replies */}
              {reply.children && reply.children.length > 0 && (
                <div className="ml-6 mt-2 space-y-2">
                  {reply.children.map((child) => (
                    <div key={child.id}>
                      <div className="border border-muted-teal rounded-lg p-3 bg-white/40">
                        <div className="flex items-center gap-2 text-xs text-dark-slate/50 mb-1">
                          {child.author.image && (
                            <img
                              src={child.author.image}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          <span className="font-medium text-dark-slate/70">
                            {child.author.name ?? "Okänd"}
                          </span>
                          <span>·</span>
                          <span>{timeAgo(child.createdAt)}</span>
                        </div>
                        <p className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed">
                          {child.body}
                        </p>
                      </div>

                      {/* Level 3 replies */}
                      {child.children && child.children.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {child.children.map((grandchild) => (
                            <div
                              key={grandchild.id}
                              className="border border-muted-teal rounded-lg p-3 bg-white/30"
                            >
                              <div className="flex items-center gap-2 text-xs text-dark-slate/50 mb-1">
                                {grandchild.author.image && (
                                  <img
                                    src={grandchild.author.image}
                                    alt=""
                                    className="w-4 h-4 rounded-full"
                                  />
                                )}
                                <span className="font-medium text-dark-slate/70">
                                  {grandchild.author.name ?? "Okänd"}
                                </span>
                                <span>·</span>
                                <span>{timeAgo(grandchild.createdAt)}</span>
                              </div>
                              <p className="text-sm text-dark-slate/80 whitespace-pre-wrap leading-relaxed">
                                {grandchild.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {session ? (
        <div className="border border-muted-teal rounded-lg p-5">
          <h2 className="text-sm font-semibold text-dark-slate mb-4">Skriv ett svar</h2>
          <ReplyForm postId={post.id} projectSlug={slug} />
        </div>
      ) : (
        <div className="border border-dashed border-muted-teal rounded-lg p-6 text-center">
          <p className="text-sm text-dark-slate/50">
            <Link href="/login" className="text-seagrass hover:underline">
              Logga in
            </Link>{" "}
            för att svara.
          </p>
        </div>
      )}
    </div>
  );
}
