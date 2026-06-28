import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; channelId: string }> }
) {
  const { slug, channelId } = await params;

  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
  });
  if (!member) return new Response("Forbidden", { status: 403 });

  const lastEventId = request.headers.get("last-event-id");
  let since: Date = lastEventId
    ? new Date(lastEventId)
    : new Date(Date.now() - 60_000);

  const encoder = new TextEncoder();
  const POLL_INTERVAL = 1500;
  const MAX_DURATION = 45_000;

  let intervalHandle: ReturnType<typeof setInterval>;
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      intervalHandle = setInterval(async () => {
        try {
          const messages = await prisma.channelMessage.findMany({
            where: {
              channelId,
              threadParentId: null,
              createdAt: { gt: since },
            },
            include: {
              author: { select: { id: true, name: true, image: true } },
              reactions: { select: { emoji: true, userId: true } },
              _count: { select: { threadReplies: true } },
            },
            orderBy: { createdAt: "asc" },
          });

          if (messages.length > 0) {
            since = messages[messages.length - 1].createdAt;
            for (const msg of messages) {
              const eventId = msg.createdAt.toISOString();
              const data = JSON.stringify(msg);
              controller.enqueue(
                encoder.encode(`id: ${eventId}\nevent: message\ndata: ${data}\n\n`)
              );
            }
          }
        } catch {
          // DB error — keep trying
        }
      }, POLL_INTERVAL);

      closeHandle = setTimeout(() => {
        clearInterval(intervalHandle);
        controller.enqueue(encoder.encode("event: close\ndata: reconnect\n\n"));
        controller.close();
      }, MAX_DURATION);
    },
    cancel() {
      clearInterval(intervalHandle);
      clearTimeout(closeHandle);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
