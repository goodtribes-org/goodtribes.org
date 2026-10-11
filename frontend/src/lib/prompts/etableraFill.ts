// Prompts for the AI preparing the Etablera phase after the pilot's go
// (see lib/etableraFill.ts). One small call per section.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: pilotens resultat och beslutsunderlaget från fasgrinden, framgångskriterierna, impact-värdena, arbetsflödena, pilotplanen, lanseringsplanen, kärnteamet och omvärldsbevakningen. Hitta ALDRIG på fakta: inga siffror, bidragsgivare, organisationer eller personer som inte nämns i underlaget.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret.
- Projekten drivs av ideella deltagare med begränsad tid — håll det enkelt och genomförbart.`;

const PHASE_CONTEXT = `Piloten är klar och projektet är nu i Etablera: det ska rulla av sig självt, så att det inte hänger på några få eldsjälar. Teamet skriver ner hur de gör (vem gör vad, rutiner, hur en ny person kommer igång), ser till att pengarna räcker, bygger samarbeten och tar hand om människorna runt projektet. Skriv utan facktermer.`;

const withRules = (task: string, tool: string) => `${PHASE_CONTEXT}\n\n${task}\n\n${SHARED_RULES}\n\nSvara genom verktyget "${tool}".`;

// ─── Etableringsplan ────────────────────────────────────────────────────────

export const SUPPORTERS_SYSTEM_PROMPT = withRules(
  `Skriv ett första utkast om människorna runt projektet, vanlig text (korta rader med "- " går bra), högst 8 rader: vilka som är med eller kan vara med (deltagare, volontärer, lokala aktörer), hur ni välkomnar nya, hur ni håller kvar dem som är med, och hur de kan bidra. Bygg på det piloten visat.`,
  "manniskor",
);

export const SUPPORTERS_TOOL = {
  name: "manniskor",
  description: "Utkast om människorna runt projektet.",
  input_schema: {
    type: "object" as const,
    properties: { supporters: { type: "string" } },
    required: ["supporters"],
  },
};

// ─── Finansieringsplan ──────────────────────────────────────────────────────

export const FUNDING_PLAN_SYSTEM_PROMPT = withRules(
  `Ta fram en plan för stabil drift och återkommande finansiering. Ta fram:
- costs: vad driften kostar eller kräver per år/månad — bara det som går att motivera ur underlaget; annars vad som behöver räknas fram.
- sources: 3–5 typer av finansiering som passar projektet (t.ex. kommunal överenskommelse, stiftelsebidrag, sponsring från lokala företag, medlemsavgifter, crowdfunding på GoodTribes) — med en mening om varför var och en passar och vad den kräver. Nämn bara organisationer vid namn om de finns i underlaget.
- recurring: hur finansieringen blir återkommande snarare än engångs (1–3 punkter).
- next_steps: 2–4 konkreta nästa steg.`,
  "finansieringsplan",
);

export const FUNDING_PLAN_TOOL = {
  name: "finansieringsplan",
  description: "Plan för stabil drift och återkommande finansiering.",
  input_schema: {
    type: "object" as const,
    properties: {
      costs: { type: "array", items: { type: "string" }, maxItems: 5 },
      sources: { type: "array", items: { type: "string" }, maxItems: 5 },
      recurring: { type: "array", items: { type: "string" }, maxItems: 3 },
      next_steps: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["sources", "next_steps"],
  },
};

// ─── Partnerskap ────────────────────────────────────────────────────────────

export const PARTNERSHIPS_SYSTEM_PROMPT = withRules(
  `Ta fram en plan för att formalisera partnerskap och samarbeten. Ta fram:
- partners: 2–5 partner att formalisera samarbete med — i första hand de som redan varit med i piloten eller finns i omvärldsbevakningen, annars typen av partner. För var och en: vem, vad de bidrar med och vad projektet ger tillbaka.
- agreement: vad ett samarbetsavtal bör reglera (3–5 punkter, t.ex. ansvar, livsmedelssäkerhet, kommunikation, uppsägning).
- next_steps: 2–4 konkreta nästa steg.`,
  "partnerskap",
);

export const PARTNERSHIPS_TOOL = {
  name: "partnerskap",
  description: "Plan för att formalisera partnerskap.",
  input_schema: {
    type: "object" as const,
    properties: {
      partners: { type: "array", items: { type: "string" }, maxItems: 5 },
      agreement: { type: "array", items: { type: "string" }, maxItems: 5 },
      next_steps: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["partners", "agreement"],
  },
};

// ─── Playbook ───────────────────────────────────────────────────────────────

export const PLAYBOOK_SYSTEM_PROMPT = withRules(
  `Skriv dokumentet "Så här gör vi": hur verksamheten drivs, skrivet så att en ny person — eller en ny grupp på en annan ort — kan ta över. Bygg på pilotplanen, loggen, arbetsflödena och vad piloten lärde er. Ta fram:
- summary: vad projektet gör och för vem, i 2–3 meningar.
- roles: vem gör vad — en punkt per roll: vad den gör och bestämmer.
- routines: det som görs varje vecka eller månad, och vem som gör det (3–5).
- steps: så kommer en ny person igång — det första hen behöver veta och göra (4–8 steg).
- prerequisites: det här behövs — lokaler, saker, tillstånd och kontakter (3–6 punkter).
- lessons: lärdomar och fallgropar från piloten (3–5).
- measure: vad man mäter för att veta att det fungerar (2–4).`,
  "playbook",
);

export const PLAYBOOK_TOOL = {
  name: "playbook",
  description: "Playbook för att replikera projektet.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string" },
      prerequisites: { type: "array", items: { type: "string" }, maxItems: 6 },
      steps: { type: "array", items: { type: "string" }, maxItems: 8 },
      roles: { type: "array", items: { type: "string" }, maxItems: 6 },
      routines: { type: "array", items: { type: "string" }, maxItems: 5 },
      lessons: { type: "array", items: { type: "string" }, maxItems: 5 },
      measure: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["summary", "prerequisites", "steps", "roles"],
  },
};

// ─── Uppgifter ──────────────────────────────────────────────────────────────

export const ETABLERA_TASKS_SYSTEM_PROMPT = withRules(
  `Föreslå de första 4–7 uppgifterna för Etablera — konkreta saker en person kan ta och göra klart på några timmar till ett par dagar (t.ex. lösa det som var oklart vid go/no-go, kontakta en möjlig finansiär eller partner, rekrytera till en vakant roll, begära granskning). Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad och varför.`,
  "uppgifter",
);
