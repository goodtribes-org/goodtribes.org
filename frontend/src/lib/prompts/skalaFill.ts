// Prompts for the AI preparing the Skala phase after the Etablera gate
// (see lib/skalaFill.ts). One small call per section.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: beslutsunderlaget från förra fasgrinden, dokumentet Så här gör vi, finansierings- och partnerskapsläget, människorna runt projektet och impact-värdena. Hitta ALDRIG på fakta: inga siffror, orter, finansiärer, organisationer eller personer som inte nämns i underlaget.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret.`;

const PHASE_CONTEXT = `Projektet är nu i Skala: det ska nå fler, på ett sätt som håller. Det finns fyra sätt att växa: (1) teamet växer själva — samma team, fler platser; (2) andra startar egna lokala grupper som följer dokumentet Så här gör vi och godkänns av projektet; (3) någon annan tar över — en kommun, region eller organisation gör det till ordinarie verksamhet; (4) teamet delar modellen fritt så att vem som helst kan kopiera den (på GoodTribes krediteras då ursprungsteamet). Stegen: vilka fler och var, hur ni växer, kärnan (vad som måste vara lika överallt och vad som får anpassas), första nya platsen och pengar för att växa. Skriv utan facktermer som fork, licens eller geografier.`;

const withRules = (task: string, tool: string) => `${PHASE_CONTEXT}\n\n${task}\n\n${SHARED_RULES}\n\nSvara genom verktyget "${tool}".`;

export const SCALING_PLAN_SYSTEM_PROMPT = withRules(
  `Ta fram ett första utkast till planen för att växa. Fyra fält, vanlig text (korta rader med "- " går bra), högst 7 rader var:
- goals: vilka fler ni vill nå, som 1–3 mål som går att följa upp ("från 1 till 3 skolkök till hösten"). Sätt bara nivåer som går att motivera ur underlaget; annars vad som ska mätas och att nivån sätts av teamet.
- geographies: var eller för vilka — vilka nya platser eller grupper som ligger närmast till hands och varför; nämn inga orter som inte finns i underlaget, beskriv hellre hur ni väljer.
- capital_plan: vad det kostar att starta på nya platser och vem som kan betala — skilt från vad driften kostar.
- team_or_license: första nya platsen — hur den startas och av vem, gärna som en liten pilot med samma framgångskriterier som förra piloten.`,
  "skalningsplan",
);

export const SCALING_PLAN_TOOL = {
  name: "skalningsplan",
  description: "Utkast till skalningsplan.",
  input_schema: {
    type: "object" as const,
    properties: { goals: { type: "string" }, geographies: { type: "string" }, capital_plan: { type: "string" }, team_or_license: { type: "string" } },
    required: ["goals", "geographies", "capital_plan", "team_or_license"],
  },
};

export const SCALE_CHOICE_SYSTEM_PROMPT = withRules(
  `Hjälp teamet att bestämma hur projektet ska växa. Ta fram:
- options: för vart och ett av de fyra sätten (växa själva, andra startar egna, någon tar över, dela fritt) — en kort bedömning av för- och nackdelar för just det här projektet (en punkt per sätt).
- recommendation: vilket sätt du rekommenderar och varför, i 2–3 meningar.
- requirements: vad som måste vara på plats för att rekommendationen ska fungera (2–4 punkter).`,
  "skalningsval",
);

export const SCALE_CHOICE_TOOL = {
  name: "skalningsval",
  description: "Bedömning av hur projektet ska skala.",
  input_schema: {
    type: "object" as const,
    properties: {
      options: { type: "array", items: { type: "string" }, maxItems: 4 },
      recommendation: { type: "string" },
      requirements: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["options", "recommendation"],
  },
};

export const SKALA_TASKS_SYSTEM_PROMPT = withRules(
  `Föreslå de första 4–7 uppgifterna för Skala — konkreta saker en person kan ta och göra klart på några timmar till ett par dagar (t.ex. välja nästa plats, kontakta en möjlig ny grupp eller en kommun, förbereda ett introduktionsmöte med Så här gör vi, söka pengar för att växa). Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad och varför.`,
  "uppgifter",
);

// ─── Kärnan (#331) ──────────────────────────────────────────────────────────

export const CORE_SYSTEM_PROMPT = withRules(
  `Hjälp teamet att skriva ner kärnan, så att idén inte urvattnas när den sprids. Två fält, vanlig text med korta rader som börjar med "- ", högst 6 rader var:
- core_fixed: det som måste vara lika överallt för att det ska fungera och ge samma effekt (t.ex. samma dag varje vecka, samma volontär med samma person).
- core_adaptable: det som får anpassas efter platsen (t.ex. lokal, tid på dagen, vem som samordnar).
Bygg på dokumentet Så här gör vi och vad piloten lärde er.`,
  "karnan",
);

export const CORE_TOOL = {
  name: "karnan",
  description: "Kärnan: det som måste vara lika och det som får anpassas.",
  input_schema: {
    type: "object" as const,
    properties: { core_fixed: { type: "string" }, core_adaptable: { type: "string" } },
    required: ["core_fixed", "core_adaptable"],
  },
};
