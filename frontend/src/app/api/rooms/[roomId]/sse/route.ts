import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRoomAccess } from "@/lib/roomAuth";
import { subscribeToRoom } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY_TIMEOUT = 45 * 60_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const access = await getRoomAccess(roomId, session.user.id);
  if (!access?.canRead) return new Response("Forbidden", { status: 403 });

  const lastEventId = request.headers.get("last-event-id");
  const since: Date = lastEventId ? new Date(lastEventId) : new Date(Date.now() - 60_000);

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Catch up on anything missed while disconnected, then switch to live delivery.
      try {
        const missed = await prisma.message.findMany({
          where: { roomId, threadParentId: null, createdAt: { gt: since } },
          include: {
            author: { select: { id: true, name: true, image: true } },
            reactions: { select: { emoji: true, userId: true } },
            _count: { select: { threadReplies: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        for (const msg of missed) {
          const eventId = msg.createdAt.toISOString();
          controller.enqueue(
            encoder.encode(`id: ${eventId}\nevent: message\ndata: ${JSON.stringify(msg)}\n\n`)
          );
        }
      } catch {
        // DB error on catch-up — still proceed to live subscription below
      }

      unsubscribe = subscribeToRoom(roomId, (raw) => {
        const parsed = JSON.parse(raw);
        const eventId = parsed.createdAt ?? new Date().toISOString();
        controller.enqueue(encoder.encode(`id: ${eventId}\nevent: message\ndata: ${raw}\n\n`));
      });

      closeHandle = setTimeout(() => {
        unsubscribe?.();
        controller.enqueue(encoder.encode("event: close\ndata: reconnect\n\n"));
        controller.close();
      }, SAFETY_TIMEOUT);
    },
    cancel() {
      unsubscribe?.();
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
