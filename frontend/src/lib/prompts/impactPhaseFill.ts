// Prompts for the AI in the Impact phase, the last one (see
// lib/impactPhaseFill.ts): drafts after the Skala gate, and the brief for
// the final decision — continue, replicate or close responsibly.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: impact-mätetalen med rapporterade värden, impactrapporterna (verifierade och inte), skalningsläget och tidigare beslutsunderlag. Hitta ALDRIG på resultat, siffror, verifierare eller organisationer.
- Summera ALDRIG siffror från olika rapporter eller mätetal till en egen totalsiffra — en "total sedan start"-rapport överlappar periodrapporterna, och bidrag/stöd som projektet fått är inte impact det levererat. Återge siffrorna som de rapporterats.
- Ett mätetal på 0 utan uppdateringar har bara inte rapporterats.
- Kort och konkret. Allt är utkast som teamet ändrar.`;

const PHASE_CONTEXT = `Projektet är nu i Impact, den sista fasen: mäta och rapportera den faktiska påverkan på FN:s globala mål, få den externt verifierad, fira och synliggöra resultaten för community och finansiärer, och besluta om nästa steg — fortsätta, replikera eller avsluta ansvarsfullt. På GoodTribes verifieras en impactrapport av plattformens granskare mot ett underlag (t.ex. en årsrapport, en utvärdering eller ett dataset); bara verifierade rapporter visas publikt.`;

const withRules = (task: string, tool: string) => `${PHASE_CONTEXT}\n\n${task}\n\n${SHARED_RULES}\n\nSvara genom verktyget "${tool}".`;

export const IMPACT_SUMMARY_SYSTEM_PROMPT = withRules(
  `Skriv en impactsammanfattning som teamet kan använda mot community och finansiärer. Ta fram:
- summary: vad projektet gör och för vem, i 2–3 meningar.
- results: en punkt per mätetal eller rapport — vad som uppnåtts, med siffran som den rapporterats, perioden om den finns, och om den är verifierad eller inte.
- sdgs: vilka av FN:s globala mål resultaten bidrar till och hur (bara mål som stöds av levererade resultat, inte av stöd projektet fått).
- gaps: vad som inte är mätt eller verifierat ännu (1–3 punkter).`,
  "impactsammanfattning",
);

export const IMPACT_SUMMARY_TOOL = {
  name: "impactsammanfattning",
  description: "Sammanfattning av projektets påverkan.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" },
      results: { type: "array", items: { type: "string" }, maxItems: 8 },
      sdgs: { type: "array", items: { type: "string" }, maxItems: 5 },
      gaps: { type: "array", items: { type: "string" }, maxItems: 3 },
    },
    required: ["summary", "results"],
  },
};

export const VERIFICATION_SYSTEM_PROMPT = withRules(
  `Ta fram en plan för att få påverkan externt verifierad. Vanlig text, korta rader med "- ", högst 8 rader: vilka resultat som ska verifieras först, vilket underlag som behövs för vart och ett (t.ex. loggar, kvitton, intyg från en partner, en utvärdering), vilka typer av aktörer som kan intyga eller utvärdera (utan att hitta på namn), och att resultaten lämnas in som impactrapporter för verifiering på GoodTribes.`,
  "verifiering",
);

export const CELEBRATION_SYSTEM_PROMPT = withRules(
  `Ta fram förslag på hur resultaten firas och synliggörs för community, deltagare och finansiärer. Vanlig text, korta rader med "- ", högst 8 rader: vem som ska tackas och hur, vilka kanaler som passar (utgå från projektets egna), vad som ska berättas (med rapporterade siffror, inte egna summor) och ett enkelt sätt att fira tillsammans.`,
  "fira",
);

export const TEXT_TOOL = (name: string, description: string) => ({
  name,
  description,
  input_schema: { type: "object" as const, properties: { text: { type: "string" } }, required: ["text"] },
});

export const IMPACT_TASKS_SYSTEM_PROMPT = withRules(
  `Föreslå de första 3–6 uppgifterna i Impact — konkreta saker en person kan ta och göra klart på några timmar till ett par dagar (t.ex. rapportera in värden för ett mätetal, samla underlag för en verifiering, lämna in en impactrapport, skriva ett tack till partner). Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad och varför.`,
  "uppgifter",
);

// ─── Nästa steg: fortsätta, replikera eller avsluta ansvarsfullt ────────────

export const NEXT_STEP_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Ta fram ett beslutsunderlag för projektets nästa steg. Tre möjliga vägar:
- continue: fortsätta driva projektet vidare som det är.
- replicate: låta modellen spridas — andra startar samma sak med playbooken, som regionala instanser eller forkar.
- close: avsluta ansvarsfullt — lämna över det som ska leva vidare, avsluta åtaganden, dokumentera lärdomar och tacka.

Skriv:
- situation: var projektet står (2–4 punkter).
- options: en bedömning per väg (option = continue/replicate/close, assessment = en eller två meningar för just det här projektet).
- recommendation: continue, replicate eller close.
- reasons: 2–4 korta skäl.
- first_steps: 2–4 första steg för den rekommenderade vägen (vid close: hur det görs ansvarsfullt — vad som lämnas över till vem, vad som avslutas, vad som dokumenteras).

${SHARED_RULES}

Svara genom verktyget "nasta_steg".`;

export const NEXT_STEP_TOOL = {
  name: "nasta_steg",
  description: "Beslutsunderlag för projektets nästa steg.",
  input_schema: {
    type: "object" as const,
    properties: {
      situation: { type: "array", items: { type: "string" }, maxItems: 4 },
      options: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: { option: { type: "string", enum: ["continue", "replicate", "close"] }, assessment: { type: "string" } },
          required: ["option", "assessment"],
        },
      },
      recommendation: { type: "string", enum: ["continue", "replicate", "close"] },
      reasons: { type: "array", items: { type: "string" }, maxItems: 4 },
      first_steps: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["situation", "options", "recommendation", "reasons", "first_steps"],
  },
};
