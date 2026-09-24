jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));

import type AnthropicSdk from "@anthropic-ai/sdk";
import { draftText, normalizeContentLocale, withLanguageClient, withOutputLanguage } from "../lib/aiLanguage";
import { coerceSprintPlan, sprintPlanHtml } from "../lib/uppstartFill";
import { cardWords, cardsForLanseringDecision, coerceGateBrief } from "../lib/phaseGate";

describe("output language", () => {
  it("normalizes unknown locales to Swedish", () => {
    expect(normalizeContentLocale("en")).toBe("en");
    expect(normalizeContentLocale("de")).toBe("sv");
    expect(normalizeContentLocale(null)).toBe("sv");
  });

  it("appends the rule to string, block and missing system prompts", () => {
    expect(withOutputLanguage("Du är en coach.", "en")).toMatch(/^Du är en coach\.\n\nLanguage: write everything in your answer in English/);
    expect(withOutputLanguage(undefined, "sv")).toBe("Språk: skriv allt du svarar med på svenska.");
    const blocks = withOutputLanguage([{ type: "text", text: "A" }], "en") as { text: string }[];
    expect(blocks).toHaveLength(2);
    expect(blocks[1].text).toContain("English");
  });

  it("wraps messages.create without touching the rest of the client", async () => {
    const create = jest.fn().mockResolvedValue({ content: [] });
    const client = { messages: { create }, other: 1 } as unknown as AnthropicSdk;
    const wrapped = withLanguageClient(client, "en");
    await wrapped.messages.create({ model: "m", max_tokens: 10, system: "S", messages: [] });
    expect(create.mock.calls[0][0].system).toContain("S\n\nLanguage:");
    expect((wrapped as unknown as { other: number }).other).toBe(1);
  });
});

describe("fixed draft text follows the project's language", () => {
  it("writes English headings for an English project", () => {
    const t = draftText("en");
    const plan = coerceSprintPlan({ sprint_questions: ["Will families pick up food?"] }, t)!;
    expect(plan.sprintName).toBe("Design Sprint 1");
    const html = sprintPlanHtml(plan, t);
    expect(html).toContain("Sprint questions");
    expect(html).not.toContain("Sprintfrågor");
  });

  it("uses English card prefixes", () => {
    const brief = coerceGateBrief({ unanswered: ["Who pays?"], criteria: [{ criterion: "Funding", verdict: "not_met", evidence: "" }] });
    expect(cardsForLanseringDecision("ADJUST", brief, cardWords("etablera", draftText("en")))[0].title).toBe("Find out: Who pays?");
    expect(cardsForLanseringDecision("PIVOT", brief, cardWords("skala", draftText("en")))[0].title).toBe("Reach: Funding");
  });
});
