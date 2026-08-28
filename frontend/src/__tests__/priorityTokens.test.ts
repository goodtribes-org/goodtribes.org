import { PRIORITY_TOKEN_VALUES, getPriorityTokenValue } from "../lib/priorityTokens";

describe("priorityTokens", () => {
  it("exposes the documented token value for every priority level", () => {
    expect(PRIORITY_TOKEN_VALUES).toEqual({
      low: 10,
      normal: 20,
      high: 30,
      urgent: 40,
      showstopper: 50,
    });
  });

  it("maps each known priority to its documented token value", () => {
    expect(getPriorityTokenValue("low")).toBe(10);
    expect(getPriorityTokenValue("normal")).toBe(20);
    expect(getPriorityTokenValue("high")).toBe(30);
    expect(getPriorityTokenValue("urgent")).toBe(40);
    expect(getPriorityTokenValue("showstopper")).toBe(50);
  });

  it("falls back to the normal token value for an unknown priority", () => {
    expect(getPriorityTokenValue("not-a-real-priority")).toBe(20);
    expect(getPriorityTokenValue("")).toBe(20);
  });

  // Documented current behavior, not a fix: lookup is case-sensitive, so a
  // differently-cased but semantically valid priority string (e.g. from a
  // case-mismatched caller) silently falls back to "normal" instead of
  // matching or being rejected.
  it("is case-sensitive — a differently-cased priority falls back to normal", () => {
    expect(getPriorityTokenValue("HIGH")).toBe(20);
    expect(getPriorityTokenValue("Urgent")).toBe(20);
  });
});
