// Prompts for the AI preparing the Uppstart phase after the Idé gate (see
// lib/uppstartFill.ts). One small call per section, like the Idé fill, so
// the overview page can show them appearing one by one. Kept in their own
// file so they can be edited without touching code.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget om projektet: canvasen (VET = bekräftat, ANTAR = antagande), intervjulärdomarna och beslutsunderlaget från fasgrinden. Hitta ALDRIG på fakta: inga siffror, statistik, organisationer eller personer som inte nämnts.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret.
- Projekten drivs av ideella deltagare med begränsad tid — håll det enkelt och genomförbart.`;

const PHASE_CONTEXT = `Projektet har just gått från Idéfasen till Uppstart. I Uppstart testar man snabbt om någon vill ha lösningen: man formulerar vad man testar, bygger en minsta version (t.ex. gör det för hand för några få, en första träff, en enkel prototyp att visa eller en intresseanmälan), låter möjliga användare eller kunder prova den och planerar sedan piloten. Starkast bevis är någon som betalar eller lovar att betala. Ingen metod att lära sig först — det ska gå fort, gärna på 2–4 veckor.`;

// ─── Vad vi testar och den minsta versionen ─────────────────────────────────

export const MVP_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå vad teamet ska testa och den minsta versionen att testa det med. Utgå från det mest riskfyllda antagandet om lösningen (fält märkta ANTAR, och fokus från fasgrinden).
Det teamet tror skrivs i tre korta delar som sätts ihop till "Vi tror att [vilka] vill [vad], och vi vet det när [tecken]":
- hypothesis_who: vilka det gäller, så konkret som möjligt (t.ex. "småbarnsföräldrar i Vällingby").
- hypothesis_what: vad de vill ha eller göra (t.ex. "låna en båt en lördag").
- hypothesis_sign: ett tecken folk gör, inte säger, som visar att det stämmer (t.ex. "fem familjer bokar").
- mvp_type: den enklaste formen som kan ge svar: MANUAL (gör det för hand för några få), EVENT (en första träff), PROTOTYPE (en skiss på papper eller en enkel prototyp att peka på), SIGNUP (en intresseanmälan) eller OTHER. Välj det enklaste — en skiss med penna och papper räcker ofta för att börja.
- mvp_description: 2–4 meningar om vad den minsta versionen är och hur den görs på en dag eller två, utan pengar eller med väldigt lite. Skriv utan facktermer som MVP.

${SHARED_RULES}

Svara genom verktyget "minsta_version".`;

export const MVP_TOOL = {
  name: "minsta_version",
  description: "Förslag på vad som testas och den minsta versionen.",
  input_schema: {
    type: "object" as const,
    properties: {
      hypothesis_who: { type: "string" },
      hypothesis_what: { type: "string" },
      hypothesis_sign: { type: "string" },
      mvp_type: { type: "string", enum: ["MANUAL", "EVENT", "PROTOTYPE", "SIGNUP", "OTHER"] },
      mvp_description: { type: "string" },
    },
    required: ["hypothesis_who", "hypothesis_what", "hypothesis_sign", "mvp_type", "mvp_description"],
  },
};

// ─── Första uppgifterna ─────────────────────────────────────────────────────

export const TASKS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå de första 4–7 uppgifterna för projektets Kanban-tavla i Uppstart. Konkreta saker en person kan ta och göra klart på några timmar till ett par dagar — t.ex. bygga den minsta versionen, hitta 5–10 personer som kan prova den, be någon att betala eller binda sig, ta reda på något som är oklart. Inga uppgifter som redan är gjorda.

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

// TASKS_TOOL plus a "step" per task: which of the phase's steps the task is
// work for, so the card lands tagged on the board (see lib/phaseWork.ts).
// Optional — a task that fits no step just stays tied to the phase.
export function tasksToolFor(steps: { key: string; label: string }[]) {
  const items = TASKS_TOOL.input_schema.properties.tasks.items;
  return {
    ...TASKS_TOOL,
    input_schema: {
      ...TASKS_TOOL.input_schema,
      properties: {
        tasks: {
          ...TASKS_TOOL.input_schema.properties.tasks,
          items: {
            ...items,
            properties: {
              ...items.properties,
              step: {
                type: "string",
                enum: steps.map((s) => s.key),
                description: `Vilket steg i fasen uppgiften hör till: ${steps.map((s) => `${s.key} = ${s.label}`).join("; ")}.`,
              },
            },
          },
        },
      },
    },
  };
}

// ─── Plan för piloten ───────────────────────────────────────────────────────

export const PILOT_PLAN_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Ta fram ett första utkast till plan för piloten — det som kommer efter testerna, när lösningen körs på riktigt i liten skala. Vanlig text, kort (1–3 rader per fält):
- pilot_where: var piloten görs.
- pilot_who: för vem — vilka och ungefär hur många.
- pilot_duration: hur länge.
- pilot_team: vilka som gör vad (roller, inte namn som inte nämnts).
- pilot_budget: ungefärlig budget och vad den går till. Ange bara belopp om underlaget ger stöd för dem; annars skriv vad som behöver uppskattas.
- success_criteria: 2–3 mätbara framgångskriterier ("minst X … under Y veckor"). Hitta inte på nivåer som inte går att motivera — skriv hellre vad som ska mätas.

${SHARED_RULES}

Svara genom verktyget "pilotplan".`;

export const PILOT_PLAN_TOOL = {
  name: "pilotplan",
  description: "Utkast till plan för piloten.",
  input_schema: {
    type: "object" as const,
    properties: {
      pilot_where: { type: "string" },
      pilot_who: { type: "string" },
      pilot_duration: { type: "string" },
      pilot_team: { type: "string" },
      pilot_budget: { type: "string" },
      success_criteria: { type: "array", items: { type: "string" }, maxItems: 3 },
    },
    required: ["pilot_where", "pilot_who", "pilot_duration", "success_criteria"],
  },
};
