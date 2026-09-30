const store = new Map<string, number>();
const ttls = new Map<string, number>();
let redisDown = false;

jest.mock("../lib/redis", () => ({
  redisPub: {
    get: async (k: string) => {
      if (redisDown) throw new Error("down");
      return store.has(k) ? String(store.get(k)) : null;
    },
    incrby: async (k: string, n: number) => {
      if (redisDown) throw new Error("down");
      store.set(k, (store.get(k) ?? 0) + n);
      return store.get(k);
    },
    expire: async (k: string, s: number) => {
      ttls.set(k, s);
      return 1;
    },
    ttl: async (k: string) => ttls.get(k) ?? -2,
    incr: async () => 1,
  },
}));

import { checkAiProjectBudget, getAiProjectBudgetStatus, recordAiProjectSpend } from "../lib/anthropic";

describe("project AI budget (weighted by cost)", () => {
  beforeEach(() => {
    store.clear();
    ttls.clear();
    redisDown = false;
    process.env.AI_PROJECT_MONTHLY_BUDGET_USD = "1";
  });
  afterAll(() => {
    delete process.env.AI_PROJECT_MONTHLY_BUDGET_USD;
  });

  it("allows calls until the spend reaches the budget", async () => {
    await expect(checkAiProjectBudget("p1")).resolves.toBe(true);
    await recordAiProjectSpend("p1", 999_999);
    await expect(checkAiProjectBudget("p1")).resolves.toBe(true);
    await recordAiProjectSpend("p1", 1);
    await expect(checkAiProjectBudget("p1")).resolves.toBe(false);
    await expect(checkAiProjectBudget("p2")).resolves.toBe(true);
  });

  it("sets the 30-day window on the first charge only", async () => {
    await recordAiProjectSpend("p1", 10);
    ttls.set("ai:spend:project:p1", 123);
    await recordAiProjectSpend("p1", 10);
    expect(ttls.get("ai:spend:project:p1")).toBe(123);
  });

  it("reports the used share as a capped percentage with a reset time", async () => {
    await recordAiProjectSpend("p1", 380_000);
    const s = await getAiProjectBudgetStatus("p1");
    expect(s.usedPct).toBe(38);
    expect(s.resetsAt).toBeInstanceOf(Date);
    await recordAiProjectSpend("p1", 5_000_000);
    expect((await getAiProjectBudgetStatus("p1")).usedPct).toBe(100);
    expect(await getAiProjectBudgetStatus("fresh")).toEqual({ usedPct: 0, resetsAt: null });
  });

  it("fails open when Redis is down", async () => {
    redisDown = true;
    await expect(recordAiProjectSpend("p1", 5_000_000)).resolves.toBeUndefined();
    await expect(checkAiProjectBudget("p1")).resolves.toBe(true);
  });
});
