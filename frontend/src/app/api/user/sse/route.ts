import { auth } from "@/auth";
import { subscribeToUser } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY_TIMEOUT = 45 * 60_000;

// Live-only — no DB catch-up. NotificationBell/MessagesLink/MessagesSidebar
// each already do their own initial REST fetch on mount for the current
// snapshot; this stream only needs to deliver new events from connection
// time onward (see plan for the accepted race-window trade-off).
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribeToUser(userId, (raw) => {
        const parsed = JSON.parse(raw);
        const eventName = parsed.type === "notification" ? "notification" : "room-message";
        controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${raw}\n\n`));
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
