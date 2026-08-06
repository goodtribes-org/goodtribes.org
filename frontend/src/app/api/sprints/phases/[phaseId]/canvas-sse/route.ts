import { prisma } from "@/lib/prisma";
import { subscribeToSprintCanvas } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY_TIMEOUT = 45 * 60_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { phaseId } = await params;

  // Same "readable by anyone who can view the project" philosophy as the
  // Kanban SSE route — no membership gate on reading the live stream,
  // only on actually broadcasting a change (see broadcastCanvasChange).
  const phase = await prisma.sprintPhase.findUnique({ where: { id: phaseId }, select: { id: true } });
  if (!phase) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closeHandle: ReturnType<typeof setTimeout>;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribeToSprintCanvas(phaseId, (raw) => {
        controller.enqueue(encoder.encode(`event: canvas-change\ndata: ${raw}\n\n`));
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
