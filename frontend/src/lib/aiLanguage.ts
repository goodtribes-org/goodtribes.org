import type AnthropicSdk from "@anthropic-ai/sdk";
import { routing } from "@/i18n/routing";

// The language the AI writes in. A project's own content language
// (Project.contentLocale, set from the creator's locale) decides it; the
// prompts themselves stay in Swedish and a language rule is appended to
// every system prompt by getAiClientFor — so no prompt ever hard-codes the
// output language.

export type ContentLocale = (typeof routing.locales)[number];

export function normalizeContentLocale(locale: string | null | undefined): ContentLocale {
  return (routing.locales as readonly string[]).includes(locale ?? "") ? (locale as ContentLocale) : routing.defaultLocale;
}

// The creator's locale during a request (server action / route handler);
// the default outside one (crons, scripts).
export async function requestContentLocale(): Promise<ContentLocale> {
  try {
    const { getLocale } = await import("next-intl/server");
    return normalizeContentLocale(await getLocale());
  } catch {
    return routing.defaultLocale;
  }
}

const RULES: Record<ContentLocale, string> = {
  sv: "Språk: skriv allt du svarar med på svenska.",
  en: "Language: write everything in your answer in English, even though these instructions are in Swedish. Keep names, quotes and figures from the material as they are.",
};

type SystemParam = AnthropicSdk.MessageCreateParams["system"];

export function withOutputLanguage(system: SystemParam, locale: ContentLocale): SystemParam {
  const rule = RULES[locale];
  if (!system) return rule;
  if (typeof system === "string") return `${system}\n\n${rule}`;
  return [...system, { type: "text", text: rule }];
}

// The same client, with the language rule added to every messages.create.
export function withLanguageClient(client: AnthropicSdk, locale: ContentLocale): AnthropicSdk {
  const create = client.messages.create.bind(client.messages) as (params: AnthropicSdk.MessageCreateParams, options?: AnthropicSdk.RequestOptions) => unknown;
  const messages = Object.create(client.messages, {
    create: {
      value: (params: AnthropicSdk.MessageCreateParams, options?: AnthropicSdk.RequestOptions) =>
        create({ ...params, system: withOutputLanguage(params.system, locale) }, options),
    },
  });
  return Object.create(client, { messages: { value: messages } }) as AnthropicSdk;
}

// ─── Fixed text the AI's drafts insert (headings, titles, card prefixes) ────

const TEXT = {
  sv: {
    draftNote: "Utkast från AI:n — ändra fritt.",
    draftNoteFromIdea: "Utkast från AI:n utifrån Idéfasens underlag — ändra fritt.",
    draftNoteFromUppstart: "Utkast från AI:n utifrån Uppstartens underlag — ändra fritt.",
    draftNoteFromPilot: "Utkast från AI:n utifrån pilotens resultat — ändra fritt.",
    draftNoteDecision: "Utkast från AI:n — beslutet är teamets.",
    draftNoteImpact: "Utkast från AI:n — siffrorna återges som de rapporterats, utan egna summor.",
    proposalSuffix: "(Förslag från AI:n — justera nivåerna.)",
    gateProposalSuffix: "(Förslag från beslutsunderlaget vid fasgrinden — justera nivåerna.)",
    // Wiki page titles (slugs stay the same in every language)
    titleInterviewGuide: "Intervjuguide",
    titleSprintPlan: "Sprintplan",
    titlePilotPlan: "Pilotplan",
    titleWorkflows: "Arbetsflöden och ansvar",
    titleFundingPlan: "Finansieringsplan",
    titlePartnerships: "Partnerskap",
    titlePlaybook: "Playbook",
    titleScaleChoice: "Skalning eller fork",
    titleImpactSummary: "Impactsammanfattning",
    defaultSprintName: "Design Sprint 1",
    // Interview guide
    hPurpose: "Syfte",
    hWhoToInterview: "Vilka du bör intervjua",
    hQuestions: "Frågor",
    hTips: "Tips",
    // Sprint plan
    hLongTermGoal: "Långsiktigt mål",
    hSprintQuestions: "Sprintfrågor",
    hTargetUser: "Vem vi testar med",
    hHmw: "Hur skulle vi kunna …",
    hPrototype: "Enklaste prototypen",
    hTestQuestions: "Frågor till testpersonerna",
    // Pilot plan
    hSetup: "Upplägg",
    hSteps: "Steg för steg",
    hMeasure: "Så mäter vi",
    hLogPrompts: "Efter varje pilottillfälle — skriv i loggen",
    hStopRules: "När vi pausar eller ändrar",
    // Workflows
    hResponsibilities: "Vem ansvarar för vad",
    hRoutines: "Rutiner",
    hDecisions: "Så fattar vi beslut",
    hHandover: "För att någon ska kunna ta över",
    // Etablera
    hCosts: "Vad driften kräver",
    hSources: "Möjliga finansieringskällor",
    hRecurring: "Så blir finansieringen återkommande",
    hNextSteps: "Nästa steg",
    hPartners: "Partner att formalisera samarbete med",
    hAgreement: "Det ett samarbetsavtal bör reglera",
    hWhatThisIs: "Vad det här är",
    hPrerequisites: "Det här behöver finnas innan ni startar",
    hGettingStarted: "Så kommer ni igång",
    hRoles: "Roller",
    hLessons: "Lärdomar och fallgropar",
    hWorks: "Så vet ni att det fungerar",
    // Skala
    hThreeWays: "Tre sätt att skala",
    hRecommendation: "Rekommendation",
    hRequirements: "Det här behöver finnas på plats",
    // Impact
    hWhatWeDo: "Vad vi gör",
    hResults: "Resultat",
    hSdgs: "Bidrag till de globala målen",
    hGaps: "Inte mätt eller verifierat ännu",
    // Gate cards
    cardTestAssumption: "Testa antagandet",
    cardTestAssumptionWhy: "Intervjuerna gav inget tydligt svar. Hitta ett sätt att testa det — fler intervjuer eller ett litet experiment.",
    cardRework: "Omarbeta",
    cardReworkWhy: "Underlaget motsäger det här antagandet. Tänk om och skriv om fältet.",
    cardTest: "Testa",
    cardTestWhy: "Sprinten gav inget svar på den här frågan. Testa den igen — med fler testpersoner eller en ändrad prototyp.",
    cardReworkSolution: "Omarbeta lösningen",
    cardReworkSolutionWhy: "Testerna motsäger det här antagandet om lösningen. Tänk om, skriv om fältet och testa igen.",
    cardFindOut: "Ta reda på",
    cardFindOutWhy: "Det här behövs för att kunna bedöma läget. Ta reda på det innan nästa beslut.",
    cardMeasure: "Mät",
    cardMeasureWhy: "Piloten gav inte tillräckligt underlag för det här framgångskriteriet. Fortsätt piloten och mät det.",
    cardFix: "Åtgärda",
    cardFixWhy: "Piloten nådde inte det här framgångskriteriet. Ta reda på varför och ändra lösningen innan nästa försök.",
    cardStrengthen: "Stärk",
    cardStrengthenWhy: "Underlaget räcker inte för att säga att det här är på plats. Stärk det innan ni skalar.",
    cardFixEtablera: "Åtgärda",
    cardFixEtableraWhy: "Det här saknas för att projektet ska klara att växa. Lös det innan ni skalar.",
    cardFollowUp: "Följ upp",
    cardFollowUpWhy: "Underlaget räcker inte för att säga om det här är nått. Följ upp och mät innan nästa beslut.",
    cardReach: "Nå",
    cardReachWhy: "Det här skalningsmålet eller området är inte nått. Gör en plan för att nå det, eller ändra målet.",
  },
  en: {
    draftNote: "AI draft — change anything.",
    draftNoteFromIdea: "AI draft based on the Idea phase — change anything.",
    draftNoteFromUppstart: "AI draft based on Start-up — change anything.",
    draftNoteFromPilot: "AI draft based on the pilot's results — change anything.",
    draftNoteDecision: "AI draft — the decision is the team's.",
    draftNoteImpact: "AI draft — figures are given as reported, never summed.",
    proposalSuffix: "(Proposed by the AI — adjust the levels.)",
    gateProposalSuffix: "(Proposed in the phase-gate brief — adjust the levels.)",
    titleInterviewGuide: "Interview guide",
    titleSprintPlan: "Sprint plan",
    titlePilotPlan: "Pilot plan",
    titleWorkflows: "Workflows and responsibilities",
    titleFundingPlan: "Funding plan",
    titlePartnerships: "Partnerships",
    titlePlaybook: "Playbook",
    titleScaleChoice: "Scale or fork",
    titleImpactSummary: "Impact summary",
    defaultSprintName: "Design Sprint 1",
    hPurpose: "Purpose",
    hWhoToInterview: "Who to interview",
    hQuestions: "Questions",
    hTips: "Tips",
    hLongTermGoal: "Long-term goal",
    hSprintQuestions: "Sprint questions",
    hTargetUser: "Who we test with",
    hHmw: "How might we …",
    hPrototype: "The simplest prototype",
    hTestQuestions: "Questions for the test users",
    hSetup: "Set-up",
    hSteps: "Step by step",
    hMeasure: "How we measure",
    hLogPrompts: "After each pilot session — write in the log",
    hStopRules: "When we pause or change",
    hResponsibilities: "Who is responsible for what",
    hRoutines: "Routines",
    hDecisions: "How we make decisions",
    hHandover: "So someone else can take over",
    hCosts: "What operations need",
    hSources: "Possible funding sources",
    hRecurring: "Making funding recurring",
    hNextSteps: "Next steps",
    hPartners: "Partners to formalise",
    hAgreement: "What a partnership agreement should cover",
    hWhatThisIs: "What this is",
    hPrerequisites: "What needs to be in place before you start",
    hGettingStarted: "Getting started",
    hRoles: "Roles",
    hLessons: "Lessons and pitfalls",
    hWorks: "How you know it works",
    hThreeWays: "Three ways to scale",
    hRecommendation: "Recommendation",
    hRequirements: "What needs to be in place",
    hWhatWeDo: "What we do",
    hResults: "Results",
    hSdgs: "Contribution to the Global Goals",
    hGaps: "Not yet measured or verified",
    cardTestAssumption: "Test the assumption",
    cardTestAssumptionWhy: "The interviews gave no clear answer. Find a way to test it — more interviews or a small experiment.",
    cardRework: "Rework",
    cardReworkWhy: "The evidence contradicts this assumption. Rethink it and rewrite the field.",
    cardTest: "Test",
    cardTestWhy: "The sprint didn't answer this question. Test it again — with more test users or a changed prototype.",
    cardReworkSolution: "Rework the solution",
    cardReworkSolutionWhy: "The tests contradict this assumption about the solution. Rethink it, rewrite the field and test again.",
    cardFindOut: "Find out",
    cardFindOutWhy: "This is needed to judge where things stand. Find out before the next decision.",
    cardMeasure: "Measure",
    cardMeasureWhy: "The pilot didn't give enough evidence for this success criterion. Keep the pilot going and measure it.",
    cardFix: "Fix",
    cardFixWhy: "The pilot didn't meet this success criterion. Find out why and change the solution before the next attempt.",
    cardStrengthen: "Strengthen",
    cardStrengthenWhy: "The evidence isn't enough to say this is in place. Strengthen it before you scale.",
    cardFixEtablera: "Fix",
    cardFixEtableraWhy: "This is missing for the project to be able to grow. Solve it before you scale.",
    cardFollowUp: "Follow up",
    cardFollowUpWhy: "The evidence isn't enough to say whether this is reached. Follow up and measure before the next decision.",
    cardReach: "Reach",
    cardReachWhy: "This scaling goal or area isn't reached. Make a plan to reach it, or change the goal.",
  },
} as const satisfies Record<ContentLocale, Record<string, string>>;

export type DraftText = { [K in keyof (typeof TEXT)["sv"]]: string };

export function draftText(locale: string | null | undefined): DraftText {
  return TEXT[normalizeContentLocale(locale)];
}
