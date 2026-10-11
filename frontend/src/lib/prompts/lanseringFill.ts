// Prompts for the AI preparing the Lansering phase after the Uppstart gate
// (see lib/lanseringFill.ts). One small call per section, like the Idé and
// Uppstart fills. Kept in their own file so they can be edited without
// touching code.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: canvasen, beslutsunderlaget från fasgrinden (vad testerna visade, fokus i piloten), pilotplanen och framgångskriterierna från Uppstart, och det teamet loggat. Hitta ALDRIG på fakta: inga siffror, statistik, organisationer eller personer som inte nämnts.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret.
- Projekten drivs av ideella deltagare med begränsad tid — håll det enkelt och genomförbart.`;

const PHASE_CONTEXT = `Projektet har just gått från Uppstart till Lansering. I Lansering körs piloten: lösningen prövas på riktigt i liten skala under en bestämd tid. Teamet mäter det som framgångskriterierna säger, skriver ner vad som händer, bedömer till sist varje kriterium och gör en kort plan för hur de går vidare. Skriv utan facktermer.`;

// ─── Pilotplan ──────────────────────────────────────────────────────────────

export const PILOT_PLAN_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Ta fram en pilotplan som teamet kan följa. Ta fram:
- setup: pilotens upplägg i 2–4 meningar — vad som görs, var, med vilka och hur länge.
- weeks: 3–6 steg i tidsordning (t.ex. "Vecka 1: …"), vad som ska hända och vem (roll) som ansvarar.
- measure: hur och när varje framgångskriterium mäts (2–4 punkter).
- log_prompts: 3–5 frågor teamet ska svara på i loggen efter varje pilottillfälle.
- stop_rules: 1–3 situationer där piloten ska pausas eller ändras (t.ex. om livsmedelssäkerheten inte kan garanteras).
- success_criteria: 2–4 mätbara framgångskriterier — används bara om teamet inte redan har några. Sätt inga siffror som inte går att motivera; skriv vad som mäts och låt nivån vara ett förslag.

${SHARED_RULES}

Svara genom verktyget "pilotplan".`;

export const PILOT_PLAN_TOOL = {
  name: "pilotplan",
  description: "Plan för att genomföra piloten.",
  input_schema: {
    type: "object" as const,
    properties: {
      setup: { type: "string" },
      weeks: { type: "array", items: { type: "string" }, maxItems: 6 },
      measure: { type: "array", items: { type: "string" }, maxItems: 4 },
      log_prompts: { type: "array", items: { type: "string" }, maxItems: 5 },
      stop_rules: { type: "array", items: { type: "string" }, maxItems: 3 },
      success_criteria: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["setup", "weeks", "measure", "log_prompts"],
  },
};

// ─── Impactmätning ──────────────────────────────────────────────────────────

export const IMPACT_METRICS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå 2–4 mätetal för projektets impact som teamet kan börja följa redan under piloten — helst sådana som kopplar till framgångskriterierna. Varje mätetal:
- label: vad som mäts, kort (t.ex. "Portioner som räddats").
- unit: enheten (t.ex. "portioner", "familjer", "kg").
- target: ett målvärde för piloten ENDAST om underlaget ger stöd för en nivå, annars null.
- description: en mening om hur det mäts.

Räkna bara sådant som projektet själv åstadkommer (inte bidrag eller stöd det fått).

${SHARED_RULES}

Svara genom verktyget "matetal".`;

export const IMPACT_METRICS_TOOL = {
  name: "matetal",
  description: "Mätetal för projektets impact.",
  input_schema: {
    type: "object" as const,
    properties: {
      metrics: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            unit: { type: "string" },
            target: { type: ["number", "null"] },
            description: { type: "string" },
          },
          required: ["label", "unit", "description"],
        },
      },
    },
    required: ["metrics"],
  },
};

// ─── Lanserings- och marknadsplan ───────────────────────────────────────────

export const LAUNCH_PLAN_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Ta fram ett första utkast till lanserings- och marknadsplan — hur fler i målgruppen ska få veta om och börja använda lösningen efter piloten. Vanlig text, kort (högst 5–6 rader per fält):
- target_audience: vilka ni vänder er till först (de tidiga användarna), och var de finns.
- positioning: vad ni vill att de ska förstå och känna — budskapet i en eller två meningar, med målgruppens egna ord där det går.
- budget_overview: vad lanseringen behöver (tid, material, ev. pengar). Belopp bara om underlaget ger stöd; annars vad som behöver uppskattas.
- success_metrics: hur ni ser att lanseringen fungerar.
- channels: 2–4 kanaler (t.ex. skolans föräldrabrev, lokala Facebook-grupper) med name och en kort tactic.

${SHARED_RULES}

Svara genom verktyget "lanseringsplan".`;

export const LAUNCH_PLAN_TOOL = {
  name: "lanseringsplan",
  description: "Utkast till lanserings- och marknadsplan.",
  input_schema: {
    type: "object" as const,
    properties: {
      target_audience: { type: "string" },
      positioning: { type: "string" },
      budget_overview: { type: "string" },
      success_metrics: { type: "string" },
      channels: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: { name: { type: "string" }, tactic: { type: "string" } },
          required: ["name", "tactic"],
        },
      },
    },
    required: ["target_audience", "positioning", "budget_overview", "success_metrics", "channels"],
  },
};

// ─── Arbetsflöden och ansvar ────────────────────────────────────────────────

export const WORKFLOWS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Beskriv projektets arbetsflöden och ansvar så att piloten kan köras utan att allt hänger på en person. Ta fram:
- responsibilities: vem (roll) som ansvarar för vad — en punkt per roll i kärnteamet, även vakanta roller.
- routines: 3–5 återkommande rutiner (t.ex. "Varje fredag kl 13: köket lägger upp …"), med ansvarig roll.
- decisions: hur beslut fattas och vem som bestämmer vad (2–3 punkter).
- handover: vad som behöver finnas nedskrivet för att någon annan ska kunna ta över en roll (2–3 punkter).

${SHARED_RULES}

Svara genom verktyget "arbetsfloden".`;

export const WORKFLOWS_TOOL = {
  name: "arbetsfloden",
  description: "Arbetsflöden och ansvar för piloten.",
  input_schema: {
    type: "object" as const,
    properties: {
      responsibilities: { type: "array", items: { type: "string" }, maxItems: 6 },
      routines: { type: "array", items: { type: "string" }, maxItems: 5 },
      decisions: { type: "array", items: { type: "string" }, maxItems: 3 },
      handover: { type: "array", items: { type: "string" }, maxItems: 3 },
    },
    required: ["responsibilities", "routines", "decisions"],
  },
};

// ─── Uppgifter ──────────────────────────────────────────────────────────────

export const LANSERING_TASKS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå de första 4–7 uppgifterna för att köra piloten — konkreta saker en person kan ta och göra klart på några timmar till ett par dagar (t.ex. få ett godkännande, bjuda in de första deltagarna, förbereda material, boka första pilottillfället). Inga uppgifter som redan är gjorda.

Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad och varför.

${SHARED_RULES}

Svara genom verktyget "uppgifter".`;

// ─── Sammanfatta pilotens resultat (på begäran) ─────────────────────────────

export const RESULTS_SYSTEM_PROMPT = `Du hjälper ett socialt projekt på GoodTribes.org att sammanfatta resultatet av sin pilot. Du får framgångskriterierna med teamets egen bedömning (nådde, delvis, inte, eller inte bedömt), teamets löpande pilotlogg och de mätvärden som rapporterats.

Skriv en kort resultatsammanfattning, högst ca 12 rader. Vanlig text utan markdown — inga **, * eller #; använd korta rader som börjar med "- ":
- En rad per framgångskriterium: vad loggen och värdena visar, och om det stöder teamets bedömning.
- De viktigaste lärdomarna (2–3 rader).
- Vad som saknas för att kunna utvärdera ordentligt (1–2 rader).

Grunda allt på loggen och värdena — hitta aldrig på resultat och summera aldrig siffror till egna totaler. Är underlaget tunt: säg det. Ett impact-värde som står på 0 utan uppdateringar har bara inte rapporterats ännu — säg det, kalla det inte fel.

Svara genom verktyget "resultat".`;

export const RESULTS_TOOL = {
  name: "resultat",
  description: "Sammanfattning av pilotens resultat.",
  input_schema: {
    type: "object" as const,
    properties: { summary: { type: "string" } },
    required: ["summary"],
  },
};

// ─── Mätetal per framgångskriterium (#327) ──────────────────────────────────

export const CRITERIA_METRICS_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Föreslå ett mätetal för varje kriterium under "Kriterier som saknar mätetal" — det som teamet räknar under piloten för att se om kriteriet nås.
För varje kriterium:
- criterion_number: kriteriets nummer i listan "Kriterier som saknar mätetal" (1, 2, 3 …).
- label: vad som räknas, kort (t.ex. "Familjer som bokat två gånger").
- unit: enhet (t.ex. "familjer", "promenader", "kr").
- target: målvärdet som ett tal, om kriteriet anger ett — annars utelämna.
- description: en mening om hur och när det räknas.

${SHARED_RULES}

Svara genom verktyget "matetal".`;

export const CRITERIA_METRICS_TOOL = {
  name: "matetal",
  description: "Ett mätetal per framgångskriterium.",
  input_schema: {
    type: "object" as const,
    properties: {
      metrics: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            criterion_number: { type: "integer" },
            label: { type: "string" },
            unit: { type: "string" },
            target: { type: "number" },
            description: { type: "string" },
          },
          required: ["criterion_number", "label", "unit"],
        },
      },
    },
    required: ["metrics"],
  },
};

// ─── Plan framåt (#327) ─────────────────────────────────────────────────────

export const PLAN_FORWARD_SYSTEM_PROMPT = `${PHASE_CONTEXT}

Skriv ett utkast till en kort plan framåt, utifrån canvasen och det piloten visat (bedömningen av kriterierna, loggen och mätetalen). 1–3 meningar per fält:
- who_more: vilka fler ni vill nå efter piloten.
- how_to_reach: hur ni når dem — kanaler, samarbeten, mun till mun.
- running_cost: vad det kostar att driva verksamheten i större skala, i tid, saker och pengar. Ange bara belopp om underlaget ger stöd för dem; annars skriv vad som behöver räknas ut.
- who_pays: vem som betalar driften — användarna, en kommun, en förening, bidrag, sponsorer — utifrån det canvasen säger om intäkter. Hitta inte på finansiärer.

${SHARED_RULES}

Svara genom verktyget "plan_framat".`;

export const PLAN_FORWARD_TOOL = {
  name: "plan_framat",
  description: "Utkast till plan framåt.",
  input_schema: {
    type: "object" as const,
    properties: {
      who_more: { type: "string" },
      how_to_reach: { type: "string" },
      running_cost: { type: "string" },
      who_pays: { type: "string" },
    },
    required: ["who_more", "how_to_reach", "running_cost", "who_pays"],
  },
};
