import { callMatchReasons, closesIn } from "@/lib/fundingCalls/matching";
import { nextReminderStage, reminderDays } from "@/lib/fundingCalls/reminders";

jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/outbox", () => ({ registerOutboxHandler: jest.fn(), enqueueOutboxEvent: jest.fn() }));
jest.mock("../lib/notify", () => ({ createNotification: jest.fn() }));

const call = { sdgGoals: [11, 13], applicantTypes: [] as ("COMPANY" | "NONPROFIT" | "CONSORTIUM")[], amountMinSek: null as number | null, amountMaxSek: null as number | null };
const project = { sdgGoals: [13, 3], legalType: "NONPROFIT_UMBRELLA" as const, estimatedFundingNeedSek: null as number | null };

describe("matching a call to a project", () => {
  it("needs a shared SDG, and says which", () => {
    expect(callMatchReasons(call, project)).toEqual(["Samma globala mål: 13"]);
    expect(callMatchReasons({ ...call, sdgGoals: [1] }, project)).toBeNull();
    // A call without SDGs would fit everything — it matches nothing instead.
    expect(callMatchReasons({ ...call, sdgGoals: [] }, project)).toBeNull();
  });

  it("checks who may apply against the project's legal form", () => {
    expect(callMatchReasons({ ...call, applicantTypes: ["NONPROFIT"] }, project)).toContain("Ideella organisationer får söka");
    expect(callMatchReasons({ ...call, applicantTypes: ["COMPANY"] }, project)).toBeNull();
    expect(callMatchReasons({ ...call, applicantTypes: ["COMPANY"] }, { ...project, legalType: "COMMERCIAL_UMBRELLA" as never })).toContain("Företag får söka");
    expect(callMatchReasons({ ...call, applicantTypes: ["COMPANY", "CONSORTIUM"] }, project)?.[1]).toMatch(/konsortium/);
  });

  it("only rules out on amount when both sides have a figure", () => {
    expect(callMatchReasons({ ...call, amountMaxSek: 500000 }, project)).not.toBeNull();
    expect(callMatchReasons({ ...call, amountMaxSek: 500000 }, { ...project, estimatedFundingNeedSek: 2000000 })).toBeNull();
    expect(callMatchReasons({ ...call, amountMaxSek: 500000 }, { ...project, estimatedFundingNeedSek: 300000 })?.at(-1)?.replace(/\s/g, " ")).toBe("Beloppet passar ert behov på 300 tkr");
  });

  it("says how long is left in words", () => {
    const now = Date.UTC(2026, 9, 12);
    expect(closesIn(new Date(now + 42 * 86_400_000), now)).toBe("Stänger om 6 veckor");
    expect(closesIn(new Date(now + 3 * 86_400_000), now)).toBe("Stänger om 3 dagar");
    expect(closesIn(null, now)).toBe("Löpande ansökan");
  });
});

describe("deadline reminders", () => {
  const t = [30, 14, 3];
  it("reminds at each threshold once", () => {
    expect(nextReminderStage(45, 0, t)).toBeNull();
    expect(nextReminderStage(30, 0, t)).toBe(1);
    expect(nextReminderStage(20, 1, t)).toBeNull();
    expect(nextReminderStage(14, 1, t)).toBe(2);
    expect(nextReminderStage(2, 2, t)).toBe(3);
    expect(nextReminderStage(1, 3, t)).toBeNull();
  });
  it("a late start gets one reminder, not one a day to catch up", () => {
    expect(nextReminderStage(10, 0, t)).toBe(2);
    expect(nextReminderStage(9, 2, t)).toBeNull();
  });
  it("the days can be configured", () => {
    const before = process.env.FUNDING_CALL_REMINDER_DAYS;
    process.env.FUNDING_CALL_REMINDER_DAYS = "7, 21,x";
    expect(reminderDays()).toEqual([21, 7]);
    delete process.env.FUNDING_CALL_REMINDER_DAYS;
    expect(reminderDays()).toEqual([30, 14, 3]);
    if (before) process.env.FUNDING_CALL_REMINDER_DAYS = before;
  });
});
