// The coach's reply comes from a model; parseCoachReply is what keeps a
// malformed or over-long answer from reaching the panel or the database.
jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/anthropic", () => ({ isAiEnabled: jest.fn() }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/featureFlags", () => ({ isFeatureEnabled: jest.fn() }));
jest.mock("../lib/yourTribe", () => ({ getYourTribe: jest.fn() }));

import { parseCoachReply } from "../lib/coach";

describe("parseCoachReply", () => {
  it("rejects a reply without a message", () => {
    expect(parseCoachReply({ quick_replies: ["Klart ✓"] })).toBeNull();
    expect(parseCoachReply({ message: "   " })).toBeNull();
    expect(parseCoachReply(null)).toBeNull();
  });

  it("keeps at most three quick replies and drops empty ones", () => {
    const r = parseCoachReply({ message: "Hej", quick_replies: ["Klart ✓", "", "Gör det nu", "För stort", "Senare"] });
    expect(r?.quickReplies).toEqual(["Klart ✓", "Gör det nu", "För stort"]);
  });

  it("reads a promise and promise ids marked done", () => {
    const r = parseCoachReply({
      message: "Bra!",
      quick_replies: [],
      new_promise: { text: "Sms:a Jonas", due_in_days: 2 },
      done_promise_ids: ["p1", 3, ""],
    });
    expect(r?.promise).toEqual({ text: "Sms:a Jonas", dueInDays: 2 });
    expect(r?.done).toEqual(["p1"]);
  });

  it("ignores a promise without text and treats an empty draft as none", () => {
    const r = parseCoachReply({ message: "Hej", quick_replies: [], new_promise: { text: " " }, draft: "" });
    expect(r?.promise).toBeNull();
    expect(r?.draft).toBeNull();
  });

  it("caps long text", () => {
    const r = parseCoachReply({ message: "a".repeat(5000), quick_replies: ["b".repeat(100)] });
    expect(r?.message.length).toBe(2000);
    expect(r?.quickReplies[0].length).toBe(40);
  });
});
