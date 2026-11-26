import { prisma } from "@/lib/prisma";
import { getDirectAndGroupRooms, getProjectChannelGroups, getOrgChannelGroups } from "@/lib/rooms";
import { htmlToPreviewText } from "@/lib/renderBody";
import { toProxyUrl } from "@/lib/storageUrl";

// Every conversation a person is in — DMs, groups, and the channels of their
// projects and organisations — as one list for the conversation panel and
// "Samtal" on Mitt GoodTribes (#366). Unread first, then most recent. The
// same rooms and unread rule as the messages sidebar (lib/rooms.ts); this is
// just a flat, panel-sized view of them.

export type ConversationItem = {
  roomId: string;
  kind: "dm" | "group" | "channel";
  title: string;
  /** Project or organisation name, for channels */
  context: string | null;
  image: string | null;
  preview: string | null;
  lastAt: string | null;
  unread: boolean;
};

const PREVIEW_LENGTH = 90;

function preview(body: string | null | undefined): string | null {
  if (!body) return null;
  const text = htmlToPreviewText(body).trim();
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text || null;
}

export async function getMyConversations(userId: string, take = 30): Promise<ConversationItem[]> {
  const [dmGroup, projectGroups, orgGroups] = await Promise.all([
    getDirectAndGroupRooms(userId),
    getProjectChannelGroups(userId),
    getOrgChannelGroups(userId),
  ]);

  const channels = [
    ...projectGroups.flatMap((g) => g.rooms.map((r) => ({ ...r, context: g.title }))),
    ...orgGroups.flatMap((g) => g.rooms.map((r) => ({ ...r, context: g.name }))),
  ];
  // The channel lists carry no latest message; fetch them in one go.
  const channelMeta = channels.length
    ? await prisma.room.findMany({
        where: { id: { in: channels.map((c) => c.id) } },
        select: {
          id: true,
          lastMessageAt: true,
          messages: { where: { threadParentId: null, hiddenAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
        },
      })
    : [];
  const metaById = new Map(channelMeta.map((m) => [m.id, m]));

  const items: ConversationItem[] = [
    ...dmGroup.map((r): ConversationItem => ({
      roomId: r.id,
      kind: r.type === "DM" ? "dm" : "group",
      title: r.type === "DM" ? (r.otherUsers[0]?.name ?? "?") : (r.name ?? r.otherUsers.map((u) => u.name ?? "?").join(", ")),
      context: null,
      image: r.type === "DM" && r.otherUsers[0]?.image ? toProxyUrl(r.otherUsers[0].image) : null,
      preview: preview(r.lastMessage?.body),
      lastAt: r.lastMessageAt.toISOString(),
      unread: r.unread,
    })),
    ...channels.map((c): ConversationItem => {
      const meta = metaById.get(c.id);
      return {
        roomId: c.id,
        kind: "channel",
        title: `#${c.name ?? "kanal"}`,
        context: c.context,
        image: null,
        preview: preview(meta?.messages[0]?.body),
        // A channel nobody has written in yet has no "last" time worth showing
        lastAt: meta?.messages[0] ? meta.lastMessageAt.toISOString() : null,
        unread: c.unread,
      };
    }),
  ];

  return items
    .sort((a, b) => Number(b.unread) - Number(a.unread) || (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
    .slice(0, take);
}
