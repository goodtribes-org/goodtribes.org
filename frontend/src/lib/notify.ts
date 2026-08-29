import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma"
import { publishToUser } from "@/lib/redis";
import { enqueueOutboxEvent, registerOutboxHandler } from "@/lib/outbox";

type NotificationParams = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
};

registerOutboxHandler("notification.create", async (payload) => {
  const params = payload as NotificationParams;
  const notification = await prisma.notification.create({ data: params });
  publishToUser(params.userId, { type: "notification", notification });
});

// Routed through the outbox (src/lib/outbox.ts) instead of a direct
// prisma.notification.create -- same external contract as before
// (best-effort, never throws, never blocks the caller's main flow), but the
// row backing this call is now durable the instant it's enqueued: a
// transient failure in the actual create/publish leaves it pending for
// retry via /api/cron/process-outbox instead of silently vanishing forever.
//
// Pass `tx` (a transaction client) when the caller wants this enqueued
// atomically with its own main write -- the notification will then only
// ever exist if that write actually committed. Immediate processing is
// skipped in that case (the row isn't visible to any other connection
// until the transaction commits); the next outbox sweep picks it up.
export async function createNotification(
  params: NotificationParams,
  tx: typeof prisma | Prisma.TransactionClient = prisma
) {
  try {
    await enqueueOutboxEvent(tx, "notification.create", params);
  } catch {
    // best-effort — never block the main flow
  }
}
