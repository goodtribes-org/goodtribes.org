import { auth } from "@/auth";
import { subscribeToPresence } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY_TIMEOUT = 45 * 60_000;

// Subscribes to many presence:${userId} channels at once (up to 100, same
// cap as /api/presence/status) so one page's worth of dots (e.g. the DM
// sidebar) shares a single connection instead of one per dot.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userIds = (new URL(request.url).searchParams.get("userIds") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 100);
  if (userIds.length === 0) return new Response("Bad Request", { status: 400 });

  const encoder = new TextEncoder();
  let unsubscribers: Array<() => void> = [];
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribers = userIds.map((id) =>
        subscribeToPresence(id, (raw) => {
          const parsed = JSON.parse(raw);
          controller.enqueue(
            encoder.encode(`event: presence\ndata: ${JSON.stringify({ userId: id, online: !!parsed.online })}\n\n`)
          );
        })
      );

      closeHandle = setTimeout(() => {
        unsubscribers.forEach((u) => u());
        controller.enqueue(encoder.encode("event: close\ndata: reconnect\n\n"));
        controller.close();
      }, SAFETY_TIMEOUT);
    },
    cancel() {
      unsubscribers.forEach((u) => u());
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
