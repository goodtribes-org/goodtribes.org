export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";

const prisma = new PrismaClient();

const TYPE_ICON: Record<string, string> = {
  idea_vote: "👍",
  idea_comment: "💬",
  join_request: "🙋",
  join_approved: "✅",
  join_rejected: "❌",
  blog_post: "📝",
  project_update: "📢",
  member_joined: "🎉",
  milestone_completed: "🏆",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
          <p className="text-dark-slate/50">No notifications yet.</p>
        </div>
      ) : (
        <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/40">
          {notifications.map((n) => {
            const content = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-slate">{n.title}</p>
                  {n.body && <p className="text-xs text-dark-slate/50 mt-0.5 truncate">{n.body}</p>}
                </div>
                <span className="text-xs text-dark-slate/40 flex-shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
              </div>
            );
            return n.url ? (
              <Link key={n.id} href={n.url} className="block hover:bg-dry-sage/20 transition-colors">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
