import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { KanalerShell } from "./KanalerShell";
import { isLeadRole } from "@/lib/authz";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string; channelId: string }>;
}) {
  const { slug, channelId } = await params;

  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!project) notFound();

  const channels = await prisma.channel.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });

  const currentChannel = channels.find((c) => c.id === channelId);
  if (!currentChannel) notFound();

  const messages = await prisma.channelMessage.findMany({
    where: { channelId, threadParentId: null },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reactions: { select: { emoji: true, userId: true } },
      _count: { select: { threadReplies: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  let isMember = false;
  let isAdmin = false;
  if (session?.user?.id) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
      select: { role: true },
    });
    if (member) {
      isMember = true;
      isAdmin = isLeadRole(member.role);
    }
  }

  // Unread counts per channel
  const readMarkers = session?.user?.id
    ? await prisma.channelReadMarker.findMany({
        where: { userId: session.user.id, channelId: { in: channels.map((c) => c.id) } },
        select: { channelId: true, lastReadAt: true },
      })
    : [];

  const unreadCounts = await Promise.all(
    channels.map(async (c) => {
      const marker = readMarkers.find((m) => m.channelId === c.id);
      const since = marker?.lastReadAt ?? new Date(0);
      const count = await prisma.channelMessage.count({
        where: { channelId: c.id, threadParentId: null, createdAt: { gt: since } },
      });
      return { channelId: c.id, count };
    })
  );

  const unreadMap = Object.fromEntries(unreadCounts.map((u) => [u.channelId, u.count]));

  return (
    <div style={{ width: "100vw", marginLeft: "calc(-50vw + 50%)" }}>
      <KanalerShell
        slug={slug}
        projectId={project.id}
        channels={channels}
        currentChannelId={channelId}
        initialMessages={messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }))}
        isMember={isMember}
        isAdmin={isAdmin}
        currentUserId={session?.user?.id ?? null}
        unreadMap={unreadMap}
      />
    </div>
  );
}
