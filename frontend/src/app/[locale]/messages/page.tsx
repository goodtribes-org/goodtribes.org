export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { isConversationUnread } from "@/lib/conversations";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function MessagesInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("Messages");
  const userId = session.user.id;

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: userId } },
            select: { user: { select: { id: true, name: true, image: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, senderId: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  const rows = await Promise.all(
    participations.map(async (p) => ({
      conversationId: p.conversation.id,
      lastMessageAt: p.conversation.lastMessageAt,
      otherUser: p.conversation.participants[0]?.user ?? null,
      lastMessage: p.conversation.messages[0] ?? null,
      unread: await isConversationUnread(p.conversation.id, userId, p.lastReadAt),
    }))
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

      {rows.length === 0 ? (
        <div className="border border-dashed border-muted-teal rounded-lg p-10 text-center">
          <p className="text-dark-slate/50">{t("empty")}</p>
        </div>
      ) : (
        <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/40">
          {rows.map((row) => {
            const name = row.otherUser?.name ?? "?";
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Link
                key={row.conversationId}
                href={`/messages/${row.conversationId}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-dry-sage/20 transition-colors ${row.unread ? "bg-seagrass/5" : ""}`}
              >
                {row.otherUser?.image ? (
                  <img
                    src={row.otherUser.image}
                    alt={name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {row.unread && <span className="w-1.5 h-1.5 rounded-full bg-seagrass flex-shrink-0" aria-label={t("unreadAriaLabel")} />}
                    <p className="text-sm font-medium text-dark-slate truncate">{name}</p>
                  </div>
                  {row.lastMessage && (
                    <p className="text-xs text-dark-slate/50 mt-0.5 truncate">{row.lastMessage.body}</p>
                  )}
                </div>
                <span className="text-xs text-dark-slate/40 flex-shrink-0">{timeAgo(row.lastMessageAt)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
