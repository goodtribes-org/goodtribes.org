import { addHeadingIds } from "@/lib/headingAnchors";

const aliases = { ide: "idea", idea: "idea", uppstart: "startup" };

describe("addHeadingIds", () => {
  it("gives phase headings their fixed anchor in any language or numbering", () => {
    expect(addHeadingIds("<h3>1. Idé</h3>", aliases)).toBe('<h3 id="idea">1. Idé</h3>');
    expect(addHeadingIds("<h3>Idea</h3>", aliases)).toBe('<h3 id="idea">Idea</h3>');
    expect(addHeadingIds("<h3><strong>Uppstart</strong></h3>", aliases)).toBe('<h3 id="startup"><strong>Uppstart</strong></h3>');
  });

  it("anchors other headings from their text, unique, and keeps existing ids", () => {
    expect(addHeadingIds("<h2>Tre sätt att vara med</h2><h2>Tre sätt att vara med</h2>")).toBe(
      '<h2 id="tre-satt-att-vara-med">Tre sätt att vara med</h2><h2 id="tre-satt-att-vara-med-2">Tre sätt att vara med</h2>',
    );
    expect(addHeadingIds('<h2 id="x">A</h2>')).toBe('<h2 id="x">A</h2>');
    expect(addHeadingIds("<p>Idé</p>", aliases)).toBe("<p>Idé</p>");
  });
});
