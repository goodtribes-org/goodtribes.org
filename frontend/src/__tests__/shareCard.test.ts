import { plainText, shareDescription } from "../lib/shareCard";

describe("plainText", () => {
  it("keeps a space between paragraphs", () => {
    expect(plainText("<p>…sedan hennes man dog.</p><p>Idén är enkel.</p>")).toBe("…sedan hennes man dog. Idén är enkel.");
  });
  it("decodes the common entities", () => {
    expect(plainText("<p>Mat &amp; gemenskap&nbsp;för alla</p>")).toBe("Mat & gemenskap för alla");
  });
});

describe("shareDescription", () => {
  it("prefers the summary", () => {
    expect(shareDescription({ summary: " Promenader för äldre. ", dream: "En dröm", description: "<p>Text.</p>" })).toBe("Promenader för äldre.");
  });
  it("falls back to the founder's dream", () => {
    expect(shareDescription({ summary: "", dream: "Att ingen ska gå ensam.", description: "<p>Text.</p>" })).toBe("Att ingen ska gå ensam.");
  });
  it("takes the first sentence of the description, skipping Drömguiden's headings", () => {
    expect(shareDescription({ description: "<h3>Drömmen</h3><p>Ingen ska äta ensam. Vi lagar mat ihop.</p>" })).toBe("Ingen ska äta ensam.");
  });
  it("clips long text at a word", () => {
    const out = shareDescription({ summary: "ord ".repeat(100) })!;
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith("ord…")).toBe(true);
  });
  it("returns null with nothing to say", () => {
    expect(shareDescription({ summary: null, description: null })).toBeNull();
  });
});
