import { prisma } from "@/lib/prisma";
import { subscribeToKanban } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY_TIMEOUT = 45 * 60_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Kanban boards are readable by anyone who can view the project page (no
  // membership/auth gate — matches the tasks page, which has no access check
  // beyond the project existing), so this route only checks that.
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribeToKanban(slug, (raw) => {
        controller.enqueue(encoder.encode(`event: kanban-change\ndata: ${raw}\n\n`));
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
