// Prompts for the AI preparing the Uppstart phase after the Idé gate (see
// lib/uppstartFill.ts). One small call per section, like the Idé fill, so
// the overview page can show them appearing one by one. Kept in their own
// file so they can be edited without touching code.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget om projektet: canvasen (VET = bekräftat, ANTAR = antagande), intervjulärdomarna och beslutsunderlaget från fasgrinden. Hitta ALDRIG på fakta: inga siffror, statistik, organisationer eller personer som inte nämnts.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret, på svenska.
- Projekten drivs av ideella deltagare med begränsad tid — håll det enkelt och genomförbart.`;

const PHASE_CONTEXT = `Projektet har just gått från Idéfasen till Uppstart. I Uppstart bildar man ett kärnteam, testar lösningen i en Design Sprint (Kartlägga & förstå → Skissa lösningar → Beslut & planera → Bygga prototyp → Testa med användare), sätter upp de första uppgifterna och planerar och avgränsar piloten.`;

// ─── Kärnteam ───────────────────────────────────────────────────────────────

export const ROLES_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå vilka roller kärnteamet behöver för Uppstart och piloten — roller, inte personer. 3–5 roller. Initiativtagaren finns redan; börja med den roll initiativtagaren naturligt har (t.ex. projektledare) och föreslå sedan det som saknas för just det här projektet (t.ex. någon som kan målgruppen, någon som kan bygga prototypen, någon som kan ekonomi eller kommunikation).

Varje roll: en kort titel och en eller två meningar om ansvar och vilken kunskap som behövs.

${SHARED_RULES}

Svara genom verktyget "roller".`;

export const ROLES_TOOL = {
  name: "roller",
  description: "Roller som kärnteamet behöver.",
  input_schema: {
    type: "object" as const,
    properties: {
      roles: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"],
        },
      },
    },
    required: ["roles"],
  },
};

// ─── Design Sprint ──────────────────────────────────────────────────────────

export const SPRINT_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Förbered projektets första Design Sprint. Sprinten ska testa de lösningsantaganden som beslutsunderlaget pekar ut som viktigast (fokus härnäst), inte bekräfta problemet igen.

Ta fram:
- sprint_name: ett kort namn på sprinten.
- long_term_goal: ett långsiktigt mål — hur ser det ut om ett år om det går bra? En mening.
- sprint_questions: 2–4 frågor sprinten ska besvara ("Kommer familjerna att …?"). Det är de största riskerna formulerade som frågor.
- target_user: vem ni ska testa prototypen med och hur ni hittar 5 sådana personer.
- hmw: 3–6 "Hur skulle vi kunna …"-frågor som startar Kartlägga & förstå.
- prototype_hint: den enklaste prototypen som kan besvara sprintfrågorna (gärna något som går att bygga på en dag, t.ex. klickbara skisser, ett formulär eller ett manuellt test).
- test_questions: 4–6 frågor att ställa till testpersonerna i steg 5 — öppna frågor om deras beteende, inte "skulle du använda det här?".

${SHARED_RULES}

Svara genom verktyget "sprintplan".`;

export const SPRINT_TOOL = {
  name: "sprintplan",
  description: "Förberedelse av projektets första Design Sprint.",
  input_schema: {
    type: "object" as const,
    properties: {
      sprint_name: { type: "string" },
      long_term_goal: { type: "string" },
      sprint_questions: { type: "array", items: { type: "string" }, maxItems: 4 },
      target_user: { type: "string" },
      hmw: { type: "array", items: { type: "string" }, maxItems: 6 },
      prototype_hint: { type: "string" },
      test_questions: { type: "array", items: { type: "string" }, maxItems: 6 },
    },
    required: ["sprint_name", "long_term_goal", "sprint_questions", "target_user", "hmw", "test_questions"],
  },
};

// ─── Första uppgifterna ─────────────────────────────────────────────────────

export const TASKS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå de första 4–7 uppgifterna för projektets Kanban-tavla i Uppstart. Konkreta saker en person kan ta och göra klart på några timmar till ett par dagar — t.ex. boka tid för sprinten, hitta testpersoner, ta reda på något som är oklart, kontakta en möjlig partner. Inte sprintens steg i sig (de har ett eget verktyg), och inga uppgifter som redan är gjorda.

Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad som ska göras och varför.

${SHARED_RULES}

Svara genom verktyget "uppgifter".`;

export const TASKS_TOOL = {
  name: "uppgifter",
  description: "De första uppgifterna för Uppstart.",
  input_schema: {
    type: "object" as const,
    properties: {
      tasks: {
        type: "array",
        maxItems: 7,
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"],
        },
      },
    },
    required: ["tasks"],
  },
};

// ─── Projektplan ────────────────────────────────────────────────────────────

export const PLAN_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Ta fram ett första utkast till projektplan för Uppstart och piloten. Fyra fält, vanlig text (radbrytningar och korta listor med "- " går bra). Håll det kort — högst 6–8 korta rader per fält; det är ett utkast teamet bygger vidare på, inte ett färdigt dokument:
- goal: pilotens mål och avgränsning — vad piloten ska visa, var och med vilka den görs, ungefär hur länge och hur stor den är, och vad som medvetet lämnas utanför.
- milestones: 3–5 milstolpar från nu till en genomförd pilot, i ordning.
- resources: grov budget och resursbehov — vad som behövs (tid, kompetens, lokaler, verktyg, pengar). Ange bara belopp om underlaget ger stöd för dem; annars skriv vad som behöver uppskattas.
- risks: 2–4 största riskerna och hur de kan hanteras.

${SHARED_RULES}

Svara genom verktyget "projektplan".`;

export const PLAN_TOOL = {
  name: "projektplan",
  description: "Utkast till projektplan för Uppstart och piloten.",
  input_schema: {
    type: "object" as const,
    properties: {
      goal: { type: "string" },
      milestones: { type: "string" },
      resources: { type: "string" },
      risks: { type: "string" },
    },
    required: ["goal", "milestones", "resources", "risks"],
  },
};
