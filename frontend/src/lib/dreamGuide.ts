import type { ProjectAmbition, TeamMode } from "@prisma/client";
import type { DreamArea } from "@/lib/dreamConversation";

// Drömguiden (#214): the start of every new project, with fixed questions
// instead of Drömsamtalet's AI chat. Five of Drömsamtalet's six areas are a
// question each; the sixth (conditions) is buttons. Shared by the guide
// (client) and createProjectFromGuide (server), so the two can't drift.

export const GUIDE_AREAS = ["dream", "problem", "why_you", "idea", "people"] as const satisfies readonly DreamArea[];
export type GuideArea = (typeof GUIDE_AREAS)[number];

export const MAX_ANSWER_LENGTH = 2000;
export const MAX_NAME_LENGTH = 120;

// Button values → the Project fields Drömsamtalet's summary also fills.
export const WEEKLY_HOURS = { low: 2, mid: 6, high: 10 } as const;
export const TEAM_MODES = ["SOLO", "SMALL", "TEAM"] as const satisfies readonly TeamMode[];
export const AMBITIONS = ["HOBBY", "VENTURE"] as const satisfies readonly ProjectAmbition[];
export type WeeklyHoursKey = keyof typeof WEEKLY_HOURS;

export type GuideConditions = {
  time?: WeeklyHoursKey;
  team?: (typeof TEAM_MODES)[number];
  ambition?: (typeof AMBITIONS)[number];
};

export type GuideInput = {
  answers: Partial<Record<GuideArea, string>>;
  // The follow-up shown on a vague answer, and what was answered to it.
  followUps: Partial<Record<GuideArea, { question: string; answer: string }>>;
  unknown: GuideArea[];
  conditions: GuideConditions;
  name: string;
  withAi: boolean;
  // "Någon annan får driva det" (#234): the answers become an Idea instead
  // of a project.
  share?: boolean;
  // "Jag vill driva den här" (#233): the open idea this project drives.
  basedOnIdeaId?: string;
};

// Short or sweeping answers get a follow-up ("alla", "världen" — the same
// signal Drömsamtalet's prompt follows up on).
// Whole words only: "IT-folk" or "allas" isn't sweeping. Letter-aware, since
// \b treats å/ä/ö as word breaks.
const SWEEPING = /(?<![\p{L}-])(alla|världen|människor|folk|samhället|många|everyone|everybody|world|people|society)(?![\p{L}-])/iu;
export function isVagueAnswer(answer: string): boolean {
  const a = answer.trim();
  return a.length > 0 && (a.length < 40 || SWEEPING.test(a));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isArea = (v: unknown): v is GuideArea => typeof v === "string" && (GUIDE_AREAS as readonly string[]).includes(v);

// The input comes from the browser (and from localStorage across the login
// round trip), so it is rebuilt field by field, never trusted as is.
export function parseGuideInput(raw: unknown): GuideInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answersRaw = (r.answers && typeof r.answers === "object" ? r.answers : {}) as Record<string, unknown>;
  const followRaw = (r.followUps && typeof r.followUps === "object" ? r.followUps : {}) as Record<string, unknown>;
  const condRaw = (r.conditions && typeof r.conditions === "object" ? r.conditions : {}) as Record<string, unknown>;
  const unknown = Array.isArray(r.unknown) ? [...new Set(r.unknown.filter(isArea))] : [];

  const answers: GuideInput["answers"] = {};
  const followUps: GuideInput["followUps"] = {};
  for (const area of GUIDE_AREAS) {
    if (unknown.includes(area)) continue;
    const answer = str(answersRaw[area], MAX_ANSWER_LENGTH);
    if (answer) answers[area] = answer;
    const f = followRaw[area] as Record<string, unknown> | undefined;
    const fq = str(f?.question, 300);
    const fa = str(f?.answer, MAX_ANSWER_LENGTH);
    if (answer && fq && fa) followUps[area] = { question: fq, answer: fa };
  }
  const time = condRaw.time;
  return {
    answers,
    followUps,
    unknown,
    conditions: {
      time: typeof time === "string" && time in WEEKLY_HOURS ? (time as WeeklyHoursKey) : undefined,
      team: TEAM_MODES.find((t) => t === condRaw.team),
      ambition: AMBITIONS.find((a) => a === condRaw.ambition),
    },
    name: str(r.name, MAX_NAME_LENGTH),
    withAi: r.withAi !== false,
    share: r.share === true,
    basedOnIdeaId: str(r.basedOnIdeaId, 40) || undefined,
  };
}

// Without AI the dream itself names the project until the founder picks a
// name: its first words, cut at a word boundary.
export function fallbackTitle(input: GuideInput): string {
  if (input.name) return input.name;
  const source = input.answers.dream ?? input.answers.idea ?? input.answers.problem ?? "";
  const words = source.replace(/\s+/g, " ").split(" ");
  let title = "";
  for (const w of words) {
    if ((title + " " + w).trim().length > 60) break;
    title = (title + " " + w).trim();
  }
  return title.replace(/[.,;:!?]+$/, "") || "Mitt projekt";
}
