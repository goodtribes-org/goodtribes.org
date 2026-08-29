import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// A handler describes what "processing" one event type actually means.
// Registered by whichever feature owns that event type (see notify.ts) --
// this file only knows how to store, dispatch, and retry, never what any
// specific event does.
type OutboxHandler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, OutboxHandler>();

export function registerOutboxHandler(type: string, handler: OutboxHandler) {
  handlers.set(type, handler);
}

// Caps retries on a per-event basis: past this many failed attempts, a
// pending event is left alone rather than retried forever. It's never
// deleted, so lastError/attempts stay inspectable.
const MAX_ATTEMPTS = 5;

// Writes the event, then (only when NOT inside an ongoing transaction)
// makes one best-effort attempt to process it immediately -- the common
// case still feels instant, matching what direct-write call sites did
// before this existed, while the durable row underneath means a transient
// processing failure just leaves it pending for the next sweep instead of
// vanishing.
//
// The `tx === prisma` check matters: if the caller passed a transaction
// client mid-transaction, this row isn't visible to any *other* connection
// (including the one immediate processing would use) until that
// transaction commits -- attempting to process it now would just fail to
// find it. In that case the event still exists durably the moment the
// caller's transaction commits; a later processPendingOutboxEvents sweep
// (or the caller explicitly calling processOutboxEvent after commit) picks
// it up from there.
export async function enqueueOutboxEvent(tx: PrismaClientOrTx, type: string, payload: unknown) {
  const event = await tx.outboxEvent.create({
    data: { type, payload: payload as Prisma.InputJsonValue },
  });
  if (tx === prisma) {
    await processOutboxEvent(event.id);
  }
  return event;
}

// Never throws -- a handler failure is recorded on the row (attempts,
// lastError) and left pending for retry, not propagated to the caller. That
// "never blocks the caller" contract is the whole reason this exists.
export async function processOutboxEvent(id: string): Promise<boolean> {
  const event = await prisma.outboxEvent.findUnique({ where: { id } });
  if (!event || event.status !== "pending") return false;

  const handler = handlers.get(event.type);
  if (!handler) {
    logger.error("outbox: no handler registered for event type", { id, type: event.type });
    return false;
  }

  try {
    await handler(event.payload);
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: "processed", processedAt: new Date() },
    });
    return true;
  } catch (err) {
    await prisma.outboxEvent.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: err instanceof Error ? err.message : String(err) },
    });
    logger.error("outbox: handler failed", {
      id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// Sweeps pending events oldest-first -- the actual "eventually" in
// "eventually consistent." Meant to be called periodically (see
// /api/cron/process-outbox), so it also catches anything the immediate
// best-effort attempt in enqueueOutboxEvent missed: a transient failure,
// or an event enqueued from inside a transaction that skipped immediate
// processing entirely.
export async function processPendingOutboxEvents(limit = 100): Promise<{ processed: number; failed: string[] }> {
  const pending = await prisma.outboxEvent.findMany({
    where: { status: "pending", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let processed = 0;
  const failed: string[] = [];
  for (const { id } of pending) {
    const ok = await processOutboxEvent(id);
    if (ok) processed++;
    else failed.push(id);
  }
  return { processed, failed };
}
