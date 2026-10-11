import { parseVinnovaRounds } from "@/lib/fundingCalls/vinnova";
import { parseGdpCalls } from "@/lib/fundingCalls/gdp";
import { callHash, sourceProvenance } from "@/lib/fundingCalls/import";
import { acceptSuggestion, isGrounded } from "@/lib/fundingCalls/analyze";
import { shortQuote, stockholmTime, QUOTE_MAX } from "@/lib/fundingCalls/types";
import { amountLabel, compactKr } from "@/lib/fundingCalls/public";

jest.mock("../lib/prisma", () => ({ prisma: {} }));
jest.mock("../lib/aiMode", () => ({ getAiClientFor: jest.fn() }));

const now = Date.UTC(2026, 9, 12);

// Shaped like data.vinnova.se/api/ansokningsomgangar (trimmed real rows).
const round = (over: Record<string, unknown> = {}) => ({
  Diarienummer: "2025-04831",
  Titel: "Innovativa Startups 2026",
  Beskrivning: "Bidrag för unga företag.",
  Oppningsdatum: "2026-08-20T00:00:00",
  Stangningsdatum: "2026-11-05T14:00:00",
  Publik: 1,
  LankLista: [{ Beskrivning: "Ansök här", URL: "https://ansok.vinnova.se/utlysning/0382e83b?opencall=true" }],
  WebTextLista: [
    { TextID: 1, TextSv: "Ni kan söka bidrag för att testa kundbehov." },
    { TextID: 2, TextSv: "Svenska aktiebolag som är högst 10 år gamla, har max 10 anställda." },
    { TextID: 3, TextSv: "Maximalt 500 000 kr. Medfinansiering krävs ej." },
  ],
  ...over,
});

describe("Vinnova adapter", () => {
  it("reads a round's own texts, dates and links", () => {
    const [c] = parseVinnovaRounds([round()], now);
    expect(c.externalId).toBe("2025-04831");
    expect(c.eligibilityText).toContain("aktiebolag");
    expect(c.amountText).toContain("500 000");
    expect(c.applyUrl).toContain("ansok.vinnova.se");
    expect(c.url).toContain("vinnova.se");
    // 14:00 Swedish time (winter, UTC+1), whatever the server's zone.
    expect(c.deadline?.toISOString()).toBe("2026-11-05T13:00:00.000Z");
  });

  it("keeps only public rounds that are still open", () => {
    const rows = [
      round({ Diarienummer: "a", Publik: 0 }),
      round({ Diarienummer: "b", Stangningsdatum: "2026-01-01T14:00:00" }),
      round({ Diarienummer: "c", Stangningsdatum: "1900-01-01T00:00:00" }),
      round({ Diarienummer: "d" }),
    ];
    expect(parseVinnovaRounds(rows, now).map((c) => c.externalId)).toEqual(["d"]);
  });
});

describe("GDP adapter", () => {
  it("maps a GDP call and drops finished ones", () => {
    const calls = parseGdpCalls(
      [
        { diarienummer: "2026-1", titel: "Hållbart samhällsbyggande", beskrivning: "Text", status: "Pågående", budgetBelopp: 50_000_000, budgetValuta: "SEK", oppningsdatum: "2026-09-01", stangningsdatum: "2026-12-01", publiceringsplatser: [{ webbadress: "https://formas.se/x" }] },
        { diarienummer: "2025-9", titel: "Gammal", beskrivning: null, status: "Avslutad", budgetBelopp: null, budgetValuta: null, oppningsdatum: null, stangningsdatum: "2025-12-01", publiceringsplatser: null },
      ],
      now,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].totalBudgetSek).toBe(50_000_000);
    expect(calls[0].url).toBe("https://formas.se/x");
    // Open through its closing day.
    expect(calls[0].deadline!.toISOString()).toBe("2026-12-01T22:59:59.000Z");
  });
});

describe("Swedish time", () => {
  it("reads funders' local times as Stockholm time, summer and winter", () => {
    expect(stockholmTime("2026-06-15T14:00:00")!.toISOString()).toBe("2026-06-15T12:00:00.000Z");
    expect(stockholmTime("2026-12-15T14:00:00")!.toISOString()).toBe("2026-12-15T13:00:00.000Z");
    expect(stockholmTime("nonsense")).toBeNull();
  });
});

describe("import", () => {
  it("notices a change at the source and nothing else", () => {
    const [c] = parseVinnovaRounds([round()], now);
    const [same] = parseVinnovaRounds([round()], now);
    const [moved] = parseVinnovaRounds([round({ Stangningsdatum: "2026-11-20T14:00:00" })], now);
    expect(callHash(c)).toBe(callHash(same));
    expect(callHash(c)).not.toBe(callHash(moved));
  });

  it("keeps short quotes as sources, never the full text", () => {
    expect(shortQuote("x".repeat(1000))!.length).toBe(QUOTE_MAX);
    const [c] = parseVinnovaRounds([round()], now);
    const p = sourceProvenance(c);
    expect(p.eligibilityText.quote).toContain("aktiebolag");
    expect(p.deadline.quote).toBe("2026-11-05 14:00");
  });
});

describe("AI suggestions", () => {
  const source = "Svenska aktiebolag som är högst 10 år gamla. Maximalt 500 000 kr. Medfinansiering krävs ej.";
  const empty = { summary: null, applicantTypes: [], amountMinSek: null, amountMaxSek: null, totalBudgetSek: null, cofunding: null, projectLengthMonths: null, sdgGoals: [], tags: [], requirements: [], stateAidRule: null };

  it("only trusts quotes that are really in the source", () => {
    expect(isGrounded("Maximalt 500 000 kr", source)).toBe(true);
    expect(isGrounded("Maximalt 5 miljoner kr", source)).toBe(false);
    expect(isGrounded("kr", source)).toBe(false);
  });

  it("writes grounded, valid values into empty fields only", () => {
    const { data, provenance } = acceptSuggestion(
      {
        amountMaxSek: { value: 500000, quote: "Maximalt 500 000 kr." },
        amountMinSek: { value: 100000, quote: "Minst 100 000 kr" }, // not in the text
        applicantTypes: { value: ["COMPANY", "ALIENS"], quote: "Svenska aktiebolag" },
        cofunding: { value: "Krävs ej", quote: "Medfinansiering krävs ej" },
        summary: { value: "Unga företag kan söka upp till 500 000 kr.", quote: "" },
        sdgGoals: { value: [9, 42], quote: "aktiebolag som är högst 10 år" },
      },
      { ...empty, cofunding: "50 %" },
      source,
      "https://vinnova.se",
    );
    expect(data.amountMaxSek).toBe(500000);
    expect(data.amountMinSek).toBeUndefined();
    expect(data.applicantTypes).toEqual(["COMPANY"]);
    expect(data.cofunding).toBeUndefined(); // the admin's value stays
    expect(data.summary).toContain("500 000");
    expect(data.sdgGoals).toEqual([9]);
    expect(provenance.amountMaxSek.url).toBe("https://vinnova.se");
  });
});

describe("public cards", () => {
  it("shows amounts as the funder gave them", () => {
    const t = { upTo: "Upp till", from: "Från" };
    expect(amountLabel(null, 500000, t)?.replace(/\s/g, " ")).toBe("Upp till 500 000 kr");
    expect(amountLabel(1000000, 10000000, t)?.replace(/\s/g, " ")).toBe("1 000 000–10 000 000 kr");
    expect(amountLabel(null, null, t)).toBeNull();
  });
  it("fits a card's narrow cell", () => {
    expect(compactKr(500000).replace(/\s/g, " ")).toBe("500 tkr");
    expect(compactKr(3500000).replace(/\s/g, " ")).toBe("3,5 mkr");
    expect(compactKr(800)).toBe("800 kr");
  });
});
