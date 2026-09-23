jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));
jest.mock("../lib/aiParticipant", () => ({ getAiParticipantUser: jest.fn() }));
jest.mock("../lib/logger", () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

import type Anthropic from "@anthropic-ai/sdk";
import {
  coerceBasics,
  coerceMarketScan,
  coerceProposals,
  interviewGuideHtml,
  isFillInProgress,
  parseFillStatus,
  searchResultUrls,
  statusFor,
} from "../lib/ideaFill";

describe("coerceBasics", () => {
  it("enforces at most 3 SDG goals, a known category and sane conditions", () => {
    const b = coerceBasics({
      title: { value: " Digital vardag ", basis: "inferred" },
      summary: { value: "Kort", basis: "user" },
      description: { value: "Lång", basis: "user" },
      category: "Space",
      tags: ["a", "", "b"],
      sdg_goals: [3, 10, 3, 11, 4, 42],
      weekly_hours: 5.4,
      team_mode: "SOLO",
      ambition: "WORLD_DOMINATION",
      open_questions: ["Hur många?", "Hur många?", ""],
    });
    expect(b.title).toEqual({ value: "Digital vardag", basis: "inferred" });
    expect(b.category).toBe("");
    expect(b.tags).toEqual(["a", "b"]);
    expect(b.sdgGoals).toEqual([3, 10, 11]);
    expect(b.conditions).toEqual({ weeklyHours: 5, teamMode: "SOLO", ambition: null });
    expect(b.openQuestions).toEqual(["Hur många?"]);
  });

  it("survives garbage", () => {
    expect(coerceBasics(null).title.value).toBe("");
  });
});

describe("coerceProposals", () => {
  it("keeps only known fields with content", () => {
    const p = coerceProposals(
      { problem: { value: "X", basis: "user" }, channels: { value: "", basis: "user" }, bogus: { value: "Y", basis: "user" } },
      ["problem", "channels"],
    );
    expect(p).toEqual({ problem: { value: "X", basis: "user" } });
  });

  it("maps basis to vet/antar", () => {
    expect(statusFor("user")).toBe("VET");
    expect(statusFor("inferred")).toBe("ANTAR");
  });
});

describe("market scan — AI never makes up sources", () => {
  const content = [
    { type: "text", text: "Söker…" },
    {
      type: "web_search_tool_result",
      tool_use_id: "t1",
      content: [
        { type: "web_search_result", url: "https://seniorer.example.se/om-oss/", title: "Seniorer", encrypted_content: "", page_age: null },
        { type: "web_search_result", url: "https://kommun.example.se/digital", title: "Kommun", encrypted_content: "", page_age: null },
      ],
    },
  ] as unknown as Anthropic.ContentBlock[];

  it("collects the URLs that really came back from the search", () => {
    expect([...searchResultUrls(content)].sort()).toEqual(["https://kommun.example.se/digital", "https://seniorer.example.se/om-oss"]);
  });

  it("drops entries whose source wasn't in the search results, or that lack one", () => {
    const allowed = searchResultUrls(content);
    const entries = coerceMarketScan(
      {
        entries: [
          { type: "COMPETITOR", name: "Seniorer", description: "Hjälper äldre", source_url: "https://seniorer.example.se/om-oss" },
          { type: "PARTNER_PROSPECT", name: "Påhittad förening", description: "Finns inte", source_url: "https://invented.example.org" },
          { type: "TREND", name: "Utan källa", description: "Ingen url" },
          { type: "WEIRD", name: "Kommun", description: "Digital hjälp", source_url: "https://KOMMUN.example.se/digital#top" },
        ],
      },
      allowed,
    );
    expect(entries.map((e) => e.name)).toEqual(["Seniorer", "Kommun"]);
    expect(entries[1].type).toBe("COMPETITOR"); // unknown type falls back
  });
});

describe("interviewGuideHtml", () => {
  it("escapes model text and needs a few real questions", () => {
    const html = interviewGuideHtml({ purpose: "<script>x</script>", who: "Äldre", questions: ["Berätta om…", "Hur gör du?", "Vad är svårast?"] });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(interviewGuideHtml({ questions: ["En fråga"] })).toBeNull();
  });
});

describe("fill status", () => {
  it("parses known states and knows when work is still in progress", () => {
    const s = parseFillStatus({ about: "done", leanCanvas: "running", marketScan: "weird" });
    expect(s).toEqual({ about: "done", leanCanvas: "running" });
    expect(isFillInProgress(s)).toBe(true);
    expect(isFillInProgress({ about: "done", marketScan: "failed", interviewGuide: "skipped" })).toBe(false);
  });
});

describe("interviewGuideHtml markdown", () => {
  it("turns **bold** into <strong> after escaping", () => {
    const html = interviewGuideHtml({ purpose: "x", who: "**Skolkökspersonal** och <b>familjer</b>", questions: ["a", "b", "c"] })!;
    expect(html).toContain("<strong>Skolkökspersonal</strong>");
    expect(html).toContain("&lt;b&gt;familjer&lt;/b&gt;");
    expect(html).not.toContain("**");
  });
});
