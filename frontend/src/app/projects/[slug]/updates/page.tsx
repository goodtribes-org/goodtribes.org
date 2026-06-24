import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

const prisma = new PrismaClient();

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function UpdatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: true,
      blogPosts: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, image: true } } },
      },
    },
  });
  if (!project) notFound();

  const userRole = project.members.find((m) => m.userId === session?.user?.id)?.role;
  const canPost = userRole && ["owner", "admin"].includes(userRole);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href={`/projects/${slug}`} className="text-sm text-dark-slate/50 hover:text-seagrass">
            ← {project.title}
          </Link>
          <h1 className="text-2xl font-bold mt-1">Updates</h1>
        </div>
        {canPost && (
          <Link
            href={`/projects/${slug}/updates/new`}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
          >
            + Post update
          </Link>
        )}
      </div>

      {project.blogPosts.length === 0 ? (
        <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
          <p className="text-dark-slate/50">No updates yet.</p>
          {canPost && (
            <Link href={`/projects/${slug}/updates/new`} className="text-seagrass hover:underline text-sm mt-2 inline-block">
              Post the first update →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {project.blogPosts.map((post) => (
            <article key={post.id} className="border border-muted-teal rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3 text-sm text-dark-slate/50">
                {post.author.image && (
                  <img src={post.author.image} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span>{post.author.name ?? "Unknown"}</span>
                <span>·</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
              <h2 className="text-lg font-semibold mb-3">{post.title}</h2>
              <p className="text-dark-slate/70 text-sm whitespace-pre-wrap leading-relaxed">
                {post.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
