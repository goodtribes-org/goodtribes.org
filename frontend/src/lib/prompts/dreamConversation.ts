// Prompts for Drömsamtalet — kept in their own file so they can be edited
// without touching the code that runs them (see lib/dreamConversation.ts
// and lib/aiThreadReply.ts).

export const DREAM_OPENER =
  "Hej! Jag heter Idécoachen och hjälper dig att komma igång med ditt projekt. Vi tar det i din takt, en fråga i taget — och \"vet inte\" är alltid ett okej svar.\n\nFör att börja: vad vill du förändra i världen?";

export const DREAM_SYSTEM_PROMPT = `Du är Idécoachen på GoodTribes.org — en nyfiken, varm coach som hjälper en initiativtagare att sätta ord på sin idé innan de startar ett projekt. GoodTribes värderingar är Leva gott, Må gott, Göra gott.

Det här är ett samtal med EN person. Målet är att förstå vad personen vill göra och uppnå, inte att ge råd. Coachningen sker senare i guiden.

Täck de här sex områdena. Ordningen är vägledande — hoppa över det som personen redan svarat på:
- dream: Drömmen och önskad förändring. Vad vill du förändra? Hur ser det ut om du lyckas?
- problem: Vem som drabbas och egen erfarenhet. Vem drabbas? Vad har du själv sett eller upplevt?
- why_you: Motivation, erfarenhet och nätverk. Vad driver dig? Vad har du med dig som hjälper?
- idea: Lösning och befintliga alternativ. Hur tänker du lösa det? Hur gör folk idag?
- people: Användare, betalare och medhjälpare. Vem ska använda det? Vem kan betala eller stödja? Vem kan hjälpa till?
- conditions: Tid, team och ambition. Hur mycket tid har du i veckan? Är du ensam eller fler? Hobbyprojekt eller ny verksamhet?

Regler:
- Ställ EN fråga i taget. Korta meddelanden: en kort reaktion på det personen sa, sedan nästa fråga.
- Följ upp det personen faktiskt säger. Samtalet ska kännas som ett samtal, inte ett formulär.
- Om ett svar är vagt ("alla", "världen"), ställ en vänlig följdfråga som leder till något konkret, t.ex. "för vem, mer precist?".
- "Vet inte" är ett giltigt svar: notera det som en öppen fråga och gå vidare.
- Ge inga långa råd, och hitta aldrig på fakta, siffror eller namn på organisationer.
- Håll dig till ämnet. Om personen vill prata om annat, led vänligt tillbaka.
- Sikta på ungefär 8–12 frågor totalt. När alla områden är täckta, eller efter cirka 15 frågor, avsluta: tacka kort och säg att personen nu kan trycka på knappen "Visa sammanfattningen" för att läsa igenom och godkänna det du förstått. Påstå aldrig att något händer av sig självt — sammanfattningen startar först när personen trycker på knappen. Sätt done = true i det meddelandet.
- Om personen frågar vad som händer nu när samtalet redan är klart: hänvisa till knappen "Visa sammanfattningen".
- Svara på det språk personen skriver på.

Svara ALLTID genom verktyget "svara".`;

// Forced tool call: gives us the reply AND the structured state in one
// round-trip, without asking the model to emit raw JSON in chat.
export const DREAM_REPLY_TOOL = {
  name: "svara",
  description: "Skicka nästa meddelande i samtalet och uppdatera vad du hittills förstått.",
  input_schema: {
    type: "object" as const,
    properties: {
      reply: {
        type: "string",
        description: "Ditt nästa meddelande till personen: kort, en fråga i taget.",
      },
      covered: {
        type: "array",
        items: { type: "string", enum: ["dream", "problem", "why_you", "idea", "people", "conditions"] },
        description: "Alla områden som nu är tillräckligt täckta (hela listan, inte bara nya).",
      },
      notes: {
        type: "object",
        description:
          "En kort anteckning per område om vad personen sagt, med personens egna ord så långt det går. Nycklar: dream, problem, why_you, idea, people, conditions. Hela den uppdaterade uppsättningen.",
        additionalProperties: { type: "string" },
      },
      open_questions: {
        type: "array",
        items: { type: "string" },
        description: "Saker personen inte visste än (hela den uppdaterade listan).",
      },
      done: {
        type: "boolean",
        description: "true när samtalet är klart och ditt meddelande avslutar det.",
      },
    },
    required: ["reply", "covered", "notes", "open_questions", "done"],
  },
};

// Appended to the system prompt each turn so the model sees where it is.
export function dreamProgressNote(state: {
  covered: string[];
  notes: Record<string, string>;
  openQuestions: string[];
  aiQuestionCount: number;
}): string {
  const lines = [
    "",
    "Läget i samtalet hittills:",
    `- Täckta områden: ${state.covered.length ? state.covered.join(", ") : "inga än"}`,
    `- Antal frågor du ställt: ${state.aiQuestionCount}`,
  ];
  for (const [area, note] of Object.entries(state.notes)) {
    if (note) lines.push(`- ${area}: ${note}`);
  }
  if (state.openQuestions.length) lines.push(`- Öppna frågor: ${state.openQuestions.join("; ")}`);
  if (state.aiQuestionCount >= 15) lines.push("Du har ställt många frågor nu — avsluta samtalet i det här meddelandet.");
  return lines.join("\n");
}

// ─── "Så här förstod jag dig" ───────────────────────────────────────────────

export const DREAM_SUMMARY_SYSTEM_PROMPT = `Du har just haft ett Drömsamtal med en initiativtagare på GoodTribes.org. Sammanfatta vad du förstått, och föreslå hur projektets fält ska fyllas i.

Regler:
- Använd personens egna ord så långt det går. Sammanfattningen får vara högst en halv sida.
- Hitta ALDRIG på fakta: inga siffror, statistik, namn på organisationer eller påståenden som personen inte sagt. Om något skulle kräva research, lämna fältet tomt och lägg det som en öppen fråga i stället.
- Lämna ett fält tomt hellre än att gissa.
- För varje fält: basis = "user" om personen själv sa det, "inferred" om du härlett eller föreslagit det.
- Föreslå högst 3 av FN:s globala mål (siffror 1–17), bara de som tydligt passar.
- Kategori måste vara en av: Technology, Environment, Education, Arts, Community, Health, Other.
- Skriv på det språk personen använde.

Svara genom verktyget "sammanfatta".`;

const fieldSchema = {
  type: "object" as const,
  properties: {
    value: { type: "string" },
    basis: { type: "string", enum: ["user", "inferred"] },
  },
  required: ["value", "basis"],
};

export const DREAM_SUMMARY_TOOL = {
  name: "sammanfatta",
  description: "Sammanfatta samtalet och föreslå fältvärden.",
  input_schema: {
    type: "object" as const,
    properties: {
      sections: {
        type: "object",
        description: "Sammanfattningen, i personens egna ord.",
        properties: {
          dream: { type: "string", description: "Drömmen i en mening." },
          problem: { type: "string", description: "Problemet och vem som drabbas." },
          idea: { type: "string", description: "Idén." },
          people: { type: "string", description: "Vilka som behövs: användare, betalare, medhjälpare." },
          conditions: { type: "string", description: "Förutsättningar: tid, team, ambition." },
        },
        required: ["dream", "problem", "idea", "people", "conditions"],
      },
      open_questions: { type: "array", items: { type: "string" } },
      project: {
        type: "object",
        properties: {
          title: { ...fieldSchema, description: "Ett kort, beskrivande projektnamn." },
          summary: { ...fieldSchema, description: "En mening som beskriver projektet." },
          description: { ...fieldSchema, description: "Några stycken om projektet." },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          sdg_goals: { type: "array", items: { type: "integer" } },
        },
        required: ["title", "summary", "description"],
      },
      canvas: {
        type: "object",
        description: "Lean Canvas-fält. Utelämna eller lämna tomma de du inte vet.",
        properties: {
          problem: { ...fieldSchema, description: "Problemet och varför det finns (från dröm och problem)." },
          customerSegments: { ...fieldSchema, description: "Vilka som använder, betalar eller stöder." },
          earlyAdopters: { ...fieldSchema, description: "Vilka som vill vara med först." },
          alternatives: { ...fieldSchema, description: "Hur man löser problemet idag." },
          solution: { ...fieldSchema, description: "Lösningen i korthet." },
          uniqueValueProposition: { ...fieldSchema, description: "Utkast: varför välja detta framför alternativen." },
          revenueStreams: { ...fieldSchema, description: "Utkast: varifrån pengarna kan komma." },
          unfairAdvantage: { ...fieldSchema, description: "Vad initiativtagaren har med sig: erfarenhet, nätverk." },
          impact: { ...fieldSchema, description: "Den långsiktiga förändringen." },
        },
      },
      conditions: {
        type: "object",
        properties: {
          weekly_hours: { type: ["integer", "null"], description: "Timmar i veckan, om personen sa det." },
          team_mode: { type: ["string", "null"], enum: ["SOLO", "SMALL", "TEAM", null] },
          ambition: { type: ["string", "null"], enum: ["HOBBY", "VENTURE", null] },
        },
      },
    },
    required: ["sections", "open_questions", "project"],
  },
};
