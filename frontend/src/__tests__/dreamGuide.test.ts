import { fallbackTitle, isVagueAnswer, parseGuideInput } from "../lib/dreamGuide";

describe("parseGuideInput", () => {
  it("keeps only known areas, trims, and drops answers marked unknown", () => {
    const input = parseGuideInput({
      answers: { dream: "  En dröm  ", problem: "Ett problem", hacked: "x" },
      followUps: { dream: { question: "Vem?", answer: "Äldre" }, problem: { question: "Q", answer: "" } },
      unknown: ["problem", "bogus", "problem"],
      conditions: { time: "mid", team: "SMALL", ambition: "ROCKET" },
      name: " Datorfaddrar ",
      withAi: false,
    });
    expect(input.answers).toEqual({ dream: "En dröm" });
    expect(input.followUps).toEqual({ dream: { question: "Vem?", answer: "Äldre" } });
    expect(input.unknown).toEqual(["problem"]);
    expect(input.conditions).toEqual({ time: "mid", team: "SMALL", ambition: undefined });
    expect(input.name).toBe("Datorfaddrar");
    expect(input.withAi).toBe(false);
  });

  it("survives garbage from localStorage", () => {
    const input = parseGuideInput("not an object");
    expect(input.answers).toEqual({});
    expect(input.unknown).toEqual([]);
    expect(input.withAi).toBe(true);
  });

  it("caps answer length", () => {
    expect(parseGuideInput({ answers: { dream: "a".repeat(5000) } }).answers.dream).toHaveLength(2000);
  });
});

describe("fallbackTitle", () => {
  it("uses the name when given", () => {
    expect(fallbackTitle(parseGuideInput({ answers: { dream: "Något" }, name: "Mitt namn" }))).toBe("Mitt namn");
  });

  it("cuts the dream at a word boundary and drops trailing punctuation", () => {
    const title = fallbackTitle(
      parseGuideInput({ answers: { dream: "Att inga äldre i Gottsunda ska känna sig utanför för att de inte kan använda datorn." } }),
    );
    expect(title).toBe("Att inga äldre i Gottsunda ska känna sig utanför för att de");
    expect(title.length).toBeLessThanOrEqual(60);
  });
});

describe("isVagueAnswer", () => {
  it("flags short and sweeping answers, not empty or concrete ones", () => {
    expect(isVagueAnswer("")).toBe(false);
    expect(isVagueAnswer("Hjälpa folk")).toBe(true);
    expect(isVagueAnswer("Att alla ska få det bättre i hela världen genom teknik och omtanke")).toBe(true);
    expect(isVagueAnswer("Äldre i Gottsunda. Bostadsbolaget kan stödja. Pensionerade IT-folk som faddrar.")).toBe(false);
    expect(isVagueAnswer("Min granne på 82 kan inte boka vårdtid längre sedan allt blev digitalt")).toBe(false);
  });

  it("doesn't flag a long, concrete answer just because it says folk or många", () => {
    expect(isVagueAnswer("Jag har jobbat som undersköterska i 25 år och sett hur mycket en enkel promenad betyder. Jag känner folk i Hembygdsföreningen och kyrkan i Hässelby.")).toBe(false);
    expect(isVagueAnswer("Volontärer får en fast promenadvän som de träffar samma dag varje vecka. I dag finns bara kommunens träffpunkt som många inte orkar ta sig till.")).toBe(false);
  });
});
