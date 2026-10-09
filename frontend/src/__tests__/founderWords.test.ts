import { founderWordsFromDescription, founderWordsFromMessages } from "../lib/founderWords";

const labels = {
  dream: ["Vad vill du förändra?", "What do you want to change?"],
  why: ["Vad driver dig, och vad har du med dig?", "What drives you, and what do you bring?"],
  unknown: ["Vet inte än.", "Don't know yet."],
};

describe("founderWordsFromMessages", () => {
  it("takes the founder's answer right after each question", () => {
    const words = founderWordsFromMessages(
      [
        { isAi: true, body: "<p>Vad vill du förändra?</p>" },
        { isAi: false, body: "<p>Att ensamma äldre i Hässelby får en promenadkompis.</p>" },
        { isAi: true, body: "<p>Vad driver dig, och vad har du med dig?</p>" },
        { isAi: false, body: "<p>Jag har jobbat som undersköterska &amp; sett det.</p>" },
      ],
      labels,
    );
    expect(words).toEqual({
      dream: "Att ensamma äldre i Hässelby får en promenadkompis.",
      why: "Jag har jobbat som undersköterska & sett det.",
    });
  });

  it("skips 'Vet inte än' and questions the founder didn't answer", () => {
    const words = founderWordsFromMessages(
      [
        { isAi: true, body: "<p>Vad vill du förändra?</p>" },
        { isAi: true, body: "<p>Vad driver dig, och vad har du med dig?</p>" },
        { isAi: false, body: "<p>Vet inte än.</p>" },
      ],
      labels,
    );
    expect(words).toEqual({ dream: null, why: null });
  });
});

describe("founderWordsFromDescription", () => {
  it("reads the first paragraph under each heading", () => {
    const html =
      "<h3>Drömmen</h3><p>Ett utrustningsbibliotek i Gottsunda.</p><p>Följdsvar.</p>" +
      "<h3>Problemet</h3><p>Barn saknar utrustning.</p><h3>Varför du</h3><p>Jag tränar barn.</p>";
    expect(founderWordsFromDescription(html, { dream: ["Drömmen"], why: ["Varför du"] })).toEqual({
      dream: "Ett utrustningsbibliotek i Gottsunda.",
      why: "Jag tränar barn.",
    });
  });

  it("returns nothing for a description without the guide's headings", () => {
    expect(founderWordsFromDescription("<h3>Om oss</h3><p>Text</p>", { dream: ["Drömmen"], why: ["Varför du"] })).toEqual({ dream: null, why: null });
  });
});
