// Real-Postgres coverage for src/lib/notify.ts's createNotification, now
// routed through the outbox (see outbox.integration.test.ts). What a mocked
// PrismaClient can't prove: that the transaction-scoped path genuinely
// defers processing until commit, then the outbox sweep actually creates
// the real Notification row afterward.
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { processPendingOutboxEvents } from "@/lib/outbox";

let counter = 0;
function uniqueEmail(label: string) {
  counter += 1;
  return `${label}-${process.pid}-${counter}@test.goodtribes.org`;
}

describe("notify.ts (integration)", () => {
  it("createNotification with no tx creates a real Notification row via immediate outbox processing", async () => {
    const user = await prisma.user.create({ data: { email: uniqueEmail("notify-top-level") } });
    try {
      await createNotification({ userId: user.id, type: "test", title: "Hello" });

      const rows = await prisma.notification.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe("Hello");
    } finally {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.outboxEvent.deleteMany({ where: { payload: { path: ["userId"], equals: user.id } } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("createNotification with a tx defers the actual row until the sweep runs after commit", async () => {
    const user = await prisma.user.create({ data: { email: uniqueEmail("notify-deferred") } });
    try {
      await prisma.$transaction(async (tx) => {
        await createNotification({ userId: user.id, type: "test", title: "Deferred" }, tx);
      });

      // Committed, but nothing has swept it yet -- immediate processing was
      // skipped since the enqueue happened inside a transaction.
      const beforeSweep = await prisma.notification.findMany({ where: { userId: user.id } });
      expect(beforeSweep).toHaveLength(0);

      const pendingEvent = await prisma.outboxEvent.findFirst({
        where: { type: "notification.create", status: "pending", payload: { path: ["userId"], equals: user.id } },
      });
      expect(pendingEvent).not.toBeNull();

      await processPendingOutboxEvents();

      const afterSweep = await prisma.notification.findMany({ where: { userId: user.id } });
      expect(afterSweep).toHaveLength(1);
      expect(afterSweep[0].title).toBe("Deferred");
    } finally {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.outboxEvent.deleteMany({ where: { payload: { path: ["userId"], equals: user.id } } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
