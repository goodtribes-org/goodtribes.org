import { isWrittenPhaseWiki, phaseWikiTemplate } from "../lib/phaseWikiTemplates";

describe("Skriv själv templates (#311)", () => {
  it("an untouched template, in either language, isn't written", () => {
    expect(isWrittenPhaseWiki("playbook", phaseWikiTemplate("playbook", "sv").html)).toBe(false);
    expect(isWrittenPhaseWiki("playbook", phaseWikiTemplate("playbook", "en").html)).toBe(false);
    expect(isWrittenPhaseWiki("arbetsfloden", phaseWikiTemplate("arbetsfloden", "sv").html.replace(/<h2>/g, "\n<h2>"))).toBe(false);
  });
  it("an empty page isn't written", () => {
    expect(isWrittenPhaseWiki("playbook", "<p> </p>")).toBe(false);
    expect(isWrittenPhaseWiki("playbook", null)).toBe(false);
  });
  it("a template with real text in it is written", () => {
    const t = phaseWikiTemplate("arbetsfloden", "sv").html;
    expect(isWrittenPhaseWiki("arbetsfloden", t + "<p>Vi tar emot datorerna på tisdagar.</p>")).toBe(true);
  });
  it("a page the AI wrote counts as before", () => {
    expect(isWrittenPhaseWiki("playbook", "<h2>Förutsättningar</h2><p>En lokal och två volontärer.</p>")).toBe(true);
  });
});
