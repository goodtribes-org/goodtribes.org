import { indexDocuments } from "../lib/meili";
import { logger } from "../lib/logger";

jest.mock("../lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// Regression coverage for the per-index queue added so call sites can stop
// awaiting indexDocuments/deleteDocument (Fas 4 of the scaling plan) without
// losing the ordering guarantee they used to get from awaiting sequentially.
describe("meili per-index queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs same-index writes in enqueue order even when the first is slower", async () => {
    const order: string[] = [];
    let resolveFirst!: () => void;

    global.fetch = jest.fn().mockImplementation(() => {
      if (order.length === 0) {
        order.push("first-started");
        return new Promise<Response>((resolve) => {
          resolveFirst = () => {
            order.push("first-finished");
            resolve({ ok: true } as Response);
          };
        });
      }
      order.push("second-finished");
      return Promise.resolve({ ok: true } as Response);
    }) as jest.Mock;

    const p1 = indexDocuments("projects-queue-test", [{ id: "a" }]);
    const p2 = indexDocuments("projects-queue-test", [{ id: "b" }]);

    await new Promise((r) => setTimeout(r, 10));
    // Second write must not have started while the first is still pending.
    expect(order).toEqual(["first-started"]);

    resolveFirst();
    await Promise.all([p1, p2]);

    expect(order).toEqual(["first-started", "first-finished", "second-finished"]);
  });

  it("logs a failure and still runs the next queued write for that index", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true } as Response) as jest.Mock;

    await indexDocuments("ideas-queue-test", [{ id: "x" }]);
    await indexDocuments("ideas-queue-test", [{ id: "y" }]);

    expect(logger.error).toHaveBeenCalledWith(
      "meilisearch operation failed",
      expect.objectContaining({ index: "ideas-queue-test" })
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
