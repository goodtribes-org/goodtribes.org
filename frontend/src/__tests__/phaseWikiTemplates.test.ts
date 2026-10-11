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

describe("Så här gör vi (#329)", () => {
  it("an old untouched playbook template still isn't written", () => {
    const old = "<h2>Förutsättningar</h2><p><em>Vad behöver finnas på plats innan någon kan starta samma sak?</em></p><h2>Steg för steg</h2><p><em>Hur startar man, från första veckan till stabil drift?</em></p><h2>Roller</h2><p><em>Vilka roller behövs och vad gör de?</em></p><h2>Rutiner</h2><p><em>Det som behöver göras regelbundet för att det ska fungera.</em></p><h2>Lärdomar</h2><p><em>Det ni hade velat veta från början.</em></p>";
    expect(isWrittenPhaseWiki("playbook", old)).toBe(false);
    expect(isWrittenPhaseWiki("playbook", old.replace("Det ni hade velat veta från början.", "Börja i tid med lokalbokningen."))).toBe(true);
  });
});
