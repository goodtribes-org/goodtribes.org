// Prompts for the AI preparing the Skala phase after the Etablera gate
// (see lib/skalaFill.ts). One small call per section.

const SHARED_RULES = `Regler som alltid gäller:
- Utgå bara från underlaget: beslutsunderlaget från förra fasgrinden, etableringsplanen, playbooken, finansierings- och partnerskapsläget, impact-värdena och kärnteamet. Hitta ALDRIG på fakta: inga siffror, orter, finansiärer, organisationer eller personer som inte nämns i underlaget.
- Allt du skriver är ett utkast som teamet granskar och ändrar. Kort och konkret.`;

const PHASE_CONTEXT = `Projektet är nu i Skala: det ska växa till fler platser eller målgrupper. På GoodTribes kan det ske på tre sätt: (1) samma projekt växer och startar regionala instanser som godkänns av projektet, (2) projektet öppnar för att andra replikerar modellen med playbooken, eller (3) någon forkar projektet till ett nytt, oberoende initiativ (forken krediterar originalets Tribe Token-innehavare). Stegen i Skala: bestämma skalning vs. fork, sätta mätbara skalningsmål, identifiera nya geografier/målgrupper, säkra kapital för expansion och bygga lokala team eller licensiera modellen.`;

const withRules = (task: string, tool: string) => `${PHASE_CONTEXT}\n\n${task}\n\n${SHARED_RULES}\n\nSvara genom verktyget "${tool}".`;

export const SCALING_PLAN_SYSTEM_PROMPT = withRules(
  `Ta fram ett första utkast till skalningsplan. Fyra fält, vanlig text (korta rader med "- " går bra), högst 7 rader var:
- goals: 2–4 mätbara skalningsmål för det kommande året ("från 1 till 3 skolkök"). Sätt bara nivåer som går att motivera ur underlaget; annars vad som ska mätas och att nivån sätts av teamet.
- geographies: vilka nya platser eller målgrupper som ligger närmast till hands och varför — utgå från underlaget; nämn inga orter som inte finns där, beskriv hellre kriterier för att välja.
- capital_plan: vad expansionen kräver och hur den kan finansieras.
- team_or_license: hur varje ny plats drivs — lokala team inom projektet, licens/replikering med playbooken, eller en blandning — och vad som krävs av en ny grupp.`,
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
  `Hjälp teamet att bestämma hur projektet ska skala. Ta fram:
- options: för vart och ett av de tre sätten (samma projekt växer med regionala instanser, öppna för replikering med playbooken, fork till ett nytt oberoende initiativ) — en kort bedömning av för- och nackdelar för just det här projektet (en punkt per sätt).
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
      options: { type: "array", items: { type: "string" }, maxItems: 3 },
      recommendation: { type: "string" },
      requirements: { type: "array", items: { type: "string" }, maxItems: 4 },
    },
    required: ["options", "recommendation"],
  },
};

export const SKALA_TASKS_SYSTEM_PROMPT = withRules(
  `Föreslå de första 4–7 uppgifterna för Skala — konkreta saker en person kan ta och göra klart på några timmar till ett par dagar (t.ex. ta fram urvalskriterier för nästa plats, kontakta en möjlig ny grupp, förbereda ett introduktionsmöte med playbooken, söka expansionsfinansiering). Varje uppgift: en kort titel som börjar med ett verb, och en eller två meningar om vad och varför.`,
  "uppgifter",
);
