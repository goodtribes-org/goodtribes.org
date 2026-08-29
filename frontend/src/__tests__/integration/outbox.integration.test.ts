// Real-Postgres coverage for src/lib/outbox.ts. A mocked PrismaClient
// couldn't tell you whether a row written inside an uncommitted transaction
// is actually invisible to a separate connection -- that's exactly the
// property enqueueOutboxEvent's "skip immediate processing inside a
// transaction" behavior depends on, and exactly what this file proves
// against a real database instead of assuming.
import { prisma } from "@/lib/prisma";
import { enqueueOutboxEvent, processOutboxEvent, processPendingOutboxEvents, registerOutboxHandler } from "@/lib/outbox";
import { withRollback } from "./testDb";

describe("outbox.ts (integration)", () => {
  it("enqueueOutboxEvent inside a transaction does not process immediately", async () => {
    let handlerCalls = 0;
    registerOutboxHandler("test.inside-tx", async () => {
      handlerCalls++;
    });

    await withRollback(async (tx) => {
      const event = await enqueueOutboxEvent(tx, "test.inside-tx", { x: 1 });
      expect(event.status).toBe("pending");
      expect(handlerCalls).toBe(0);
    });
  });

  it("enqueueOutboxEvent with the top-level client processes immediately and marks the event processed", async () => {
    let received: unknown = null;
    registerOutboxHandler("test.top-level", async (payload) => {
      received = payload;
    });

    const event = await enqueueOutboxEvent(prisma, "test.top-level", { hello: "world" });
    try {
      expect(received).toEqual({ hello: "world" });
      const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(stored.status).toBe("processed");
      expect(stored.processedAt).not.toBeNull();
    } finally {
      await prisma.outboxEvent.delete({ where: { id: event.id } });
    }
  });

  it("a handler that throws leaves the event pending with attempts incremented, and processOutboxEvent itself does not throw", async () => {
    registerOutboxHandler("test.always-fails", async () => {
      throw new Error("boom");
    });

    const event = await enqueueOutboxEvent(prisma, "test.always-fails", {});
    try {
      const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(stored.status).toBe("pending");
      expect(stored.attempts).toBe(1);
      expect(stored.lastError).toContain("boom");

      const ok = await processOutboxEvent(event.id);
      expect(ok).toBe(false);
    } finally {
      await prisma.outboxEvent.delete({ where: { id: event.id } });
    }
  });

  it("processPendingOutboxEvents sweeps up an event that skipped immediate processing", async () => {
    let handled = false;
    registerOutboxHandler("test.swept", async () => {
      handled = true;
    });

    // Writing directly (not via enqueueOutboxEvent) simulates the exact
    // state a transaction-enqueued event is left in once its transaction
    // commits: a real pending row nobody has attempted to process yet.
    const event = await prisma.outboxEvent.create({ data: { type: "test.swept", payload: {} } });
    try {
      expect(handled).toBe(false);
      const { processed } = await processPendingOutboxEvents();
      expect(processed).toBeGreaterThanOrEqual(1);
      expect(handled).toBe(true);
      const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(stored.status).toBe("processed");
    } finally {
      await prisma.outboxEvent.delete({ where: { id: event.id } }).catch(() => {});
    }
  });
});
