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
- Sikta på ungefär 8–12 frågor totalt. När alla områden är täckta, eller efter cirka 15 frågor, avsluta: tacka, säg att du har det du behöver och att nästa steg är en sammanfattning personen får godkänna.
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
