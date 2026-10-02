import { htmlToText } from "../lib/htmlToText";

describe("htmlToText", () => {
  it("keeps paragraphs apart and decodes entities", () => {
    expect(htmlToText("<p>&quot;Vet inte&quot; är ett okej svar.</p><p>För att börja:</p>")).toBe('"Vet inte" är ett okej svar.\nFör att börja:');
  });

  it("turns line breaks and list items into lines", () => {
    expect(htmlToText("ett<br>två<ul><li>tre</li><li>fyra</li></ul>")).toBe("ett\ntvå\ntre\nfyra");
  });

  it("decodes numeric entities and leaves unknown ones alone", () => {
    expect(htmlToText("&#39;a&#x27; &amp; &foo;")).toBe("'a' & &foo;");
  });

  it("plain text passes through", () => {
    expect(htmlToText("  hej  då  ")).toBe("hej då");
  });
});
