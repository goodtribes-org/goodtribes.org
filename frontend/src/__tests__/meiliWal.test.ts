jest.mock("../lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// In-memory fake standing in for ioredis — this suite runs in CI with no
// Redis reachable, so meili.ts's crash-recovery WAL is exercised against a
// mock rather than a live connection (see the "lazy Redis import" note in
// meili.ts/githubSync.ts for why nothing here is allowed to touch a real
// ioredis client at module-import time).
const store = new Map<string, string>();
const fakeRedisPub = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
    return "OK";
  }),
  del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
  keys: jest.fn(async (pattern: string) => {
    const prefix = pattern.replace(/\*$/, "");
    return [...store.keys()].filter((k) => k.startsWith(prefix));
  }),
};

jest.mock("../lib/redis", () => ({ redisPub: fakeRedisPub }));

// Regression coverage for the crash-recovery WAL added on top of the
// per-index queue (meiliQueue.test.ts covers ordering/failure-isolation for
// the queue itself) — every still-pending job is mirrored to Redis so a pod
// restart mid-flight doesn't silently lose it.
describe("meili WAL (mocked redis)", () => {
  const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    store.clear();
    process.env.REDIS_URL = "redis://mock:6379";
  });

  afterAll(() => {
    process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  });

  it("persists a job to the WAL while in flight and clears it on success", async () => {
    const { indexDocuments } = await import("../lib/meili");
    let resolveFetch!: (v: unknown) => void;
    global.fetch = jest.fn().mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    ) as jest.Mock;

    const p = indexDocuments("wal-index", [{ id: "a" }]);
    await new Promise((r) => setTimeout(r, 10));

    const raw = store.get("meili-queue:wal-index");
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!)).toEqual([
      expect.objectContaining({ kind: "index", documents: [{ id: "a" }] }),
    ]);

    resolveFetch({ ok: true });
    await p;

    expect(store.has("meili-queue:wal-index")).toBe(false);
  });

  it("replays a job left over from a previous process before letting a new job overwrite its WAL entry", async () => {
    store.set(
      "meili-queue:wal-index",
      JSON.stringify([{ id: "leftover-1", kind: "index", documents: [{ id: "resumed" }] }])
    );

    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    const { indexDocuments } = await import("../lib/meili");

    // Enqueuing a fresh job is what triggers the resume scan — it must not
    // race its own WAL write ahead of that scan, or the leftover entry gets
    // silently clobbered instead of replayed.
    await indexDocuments("wal-index", [{ id: "new" }]);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/indexes/wal-index/documents"),
      expect.objectContaining({ body: JSON.stringify([{ id: "resumed" }]) })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/indexes/wal-index/documents"),
      expect.objectContaining({ body: JSON.stringify([{ id: "new" }]) })
    );
    expect(store.has("meili-queue:wal-index")).toBe(false);
  });

  it("never touches redis when REDIS_URL is unset", async () => {
    delete process.env.REDIS_URL;
    const { indexDocuments } = await import("../lib/meili");
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;

    await indexDocuments("wal-index-2", [{ id: "a" }]);

    expect(fakeRedisPub.set).not.toHaveBeenCalled();
    expect(fakeRedisPub.keys).not.toHaveBeenCalled();
  });
});
