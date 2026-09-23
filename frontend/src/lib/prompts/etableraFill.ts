// Prompts for the AI preparing the Etablera phase after the pilot's go
// (see lib/etableraFill.ts). One small call per section.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: pilotens resultat och beslutsunderlaget från fasgrinden, framgångskriterierna, impact-värdena, arbetsflödena, pilotplanen, lanseringsplanen, kärnteamet och omvärldsbevakningen. Hitta ALDRIG på fakta: inga siffror, bidragsgivare, organisationer eller personer som inte nämns i underlaget.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret, på svenska.
- Projekten drivs av ideella deltagare med begränsad tid — håll det enkelt och genomförbart.`;

const PHASE_CONTEXT = `Projektets pilot fick go och projektet är nu i Etablera: skala upp processen som fungerade i piloten, bygga stabil drift och återkommande finansiering, formalisera partnerskap, bygga en stabil community/supporterbas, dokumentera en "playbook" så att andra kan replikera, och låta Granskningsrådet göra en djupare granskning inför skalning.`;

const withRules = (task: string, tool: string) => `${PHASE_CONTEXT}\n\n${task}\n\n${SHARED_RULES}\n\nSvara genom verktyget "${tool}".`;

// ─── Etableringsplan ────────────────────────────────────────────────────────

export const ESTABLISHMENT_PLAN_SYSTEM_PROMPT = withRules(
  `Ta fram ett första utkast till etableringsplan. Två fält, vanlig text (korta rader med "- " går bra), högst 8 rader var:
- scaled_process: hur processen som fungerade i piloten görs till stabil, återkommande drift — vad som ska göras oftare eller på fler ställen, vad som behöver bli rutin, och vad som måste lösas först (t.ex. det som var oklart vid go/no-go).
- supporter_base: hur ni bygger en stabil community och supporterbas — vilka som ska engageras (användare, volontärer, lokala aktörer), hur de hålls kvar, och hur de kan bidra.`,
  "etableringsplan",
);

export const ESTABLISHMENT_PLAN_TOOL = {
  name: "etableringsplan",
  description: "Utkast till etableringsplan.",
  input_schema: {
    type: "object" as const,
    properties: { scaled_process: { type: "string" }, supporter_base: { type: "string" } },
    required: ["scaled_process", "supporter_base"],
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
  `Skriv en "playbook" så att någon annan — en ny grupp på en annan ort — kan starta samma sak. Bygg på pilotplanen, arbetsflödena och vad piloten lärde er. Ta fram:
- summary: vad projektet gör och för vem, i 2–3 meningar.
- prerequisites: vad som måste finnas innan man startar (tillstånd, partner, personer, verktyg) — 3–6 punkter.
- steps: hur man kommer igång, steg för steg (4–8 steg).
- roles: vilka roller som behövs och vad de gör (en punkt per roll).
- routines: de återkommande rutinerna (3–5).
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
