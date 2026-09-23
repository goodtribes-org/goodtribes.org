import type { AiMode, FieldKnowledgeStatus, ProjectAmbition, TeamMode } from "@prisma/client";
import { CATEGORIES } from "@/lib/categories";
import type { ProvenanceEntity } from "@/lib/fieldProvenance";

// The fields Drömsamtalet may fill, per entity. This is the one place that
// knows the mapping onto today's Lean Canvas columns — when Social Lean
// Canvas replaces it, only this list (and the summary tool schema) changes.
export const DREAM_CANVAS_FIELDS = [
  "problem",
  "customerSegments",
  "earlyAdopters",
  "alternatives",
  "solution",
  "uniqueValueProposition",
  "revenueStreams",
  "unfairAdvantage",
  "impact",
] as const;
export type DreamCanvasField = (typeof DREAM_CANVAS_FIELDS)[number];

export type Basis = "user" | "inferred";
export type ProposedField = { value: string; basis: Basis };

export type DreamSummarySections = {
  dream: string;
  problem: string;
  idea: string;
  people: string;
  conditions: string;
};

export type DreamSummary = {
  sections: DreamSummarySections;
  openQuestions: string[];
  project: {
    title: ProposedField;
    summary: ProposedField;
    description: ProposedField;
    category: string;
    tags: string[];
    sdgGoals: number[];
  };
  canvas: Partial<Record<DreamCanvasField, ProposedField>>;
  conditions: { weeklyHours: number | null; teamMode: TeamMode | null; ambition: ProjectAmbition | null };
};

const MAX_SDG_GOALS = 3;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function field(v: unknown): ProposedField {
  const o = (v ?? {}) as Record<string, unknown>;
  return { value: str(o.value), basis: o.basis === "user" ? "user" : "inferred" };
}

// Lenient, defensive shape check of the model's tool input — anything
// malformed becomes empty rather than failing, and the hard rules are
// enforced here, not trusted to the prompt: at most 3 SDGs, a known
// category, sane hours.
export function coerceDreamSummary(raw: unknown): DreamSummary {
  const o = (raw ?? {}) as Record<string, unknown>;
  const sections = (o.sections ?? {}) as Record<string, unknown>;
  const project = (o.project ?? {}) as Record<string, unknown>;
  const canvasRaw = (o.canvas ?? {}) as Record<string, unknown>;
  const cond = (o.conditions ?? {}) as Record<string, unknown>;

  const canvas: Partial<Record<DreamCanvasField, ProposedField>> = {};
  for (const f of DREAM_CANVAS_FIELDS) {
    const p = field(canvasRaw[f]);
    if (p.value) canvas[f] = p;
  }

  const sdgGoals = Array.isArray(project.sdg_goals)
    ? [...new Set(project.sdg_goals.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 17))].slice(0, MAX_SDG_GOALS)
    : [];
  const hours = typeof cond.weekly_hours === "number" && Number.isFinite(cond.weekly_hours) ? Math.round(cond.weekly_hours) : null;

  return {
    sections: {
      dream: str(sections.dream),
      problem: str(sections.problem),
      idea: str(sections.idea),
      people: str(sections.people),
      conditions: str(sections.conditions),
    },
    openQuestions: Array.isArray(o.open_questions)
      ? [...new Set(o.open_questions.map(str).filter(Boolean))].slice(0, 20)
      : [],
    project: {
      title: field(project.title),
      summary: field(project.summary),
      description: field(project.description),
      category: CATEGORIES.includes(str(project.category)) ? str(project.category) : "",
      tags: Array.isArray(project.tags) ? project.tags.map(str).filter(Boolean).slice(0, 8) : [],
      sdgGoals,
    },
    canvas,
    conditions: {
      weeklyHours: hours !== null && hours >= 0 && hours <= 80 ? hours : null,
      teamMode: cond.team_mode === "SOLO" || cond.team_mode === "SMALL" || cond.team_mode === "TEAM" ? cond.team_mode : null,
      ambition: cond.ambition === "HOBBY" || cond.ambition === "VENTURE" ? cond.ambition : null,
    },
  };
}

export type PlannedWrite = {
  entity: ProvenanceEntity;
  field: string;
  value: string | string[] | number[];
  status: FieldKnowledgeStatus;
};

function statusFor(basis: Basis): FieldKnowledgeStatus {
  // What the user said themselves is known; anything the AI derived is an
  // assumption until someone confirms it.
  return basis === "user" ? "VET" : "ANTAR";
}

// Which fields get written when the summary is approved, and with which
// vet/antar status. AGENT fills everything the summary proposes; ASSIST
// only sets what's needed to create the project (name, summary,
// description) — the rest is shown as suggestions next to the fields.
// Empty proposals are never written: an empty field is better than a guess.
export function planDreamWrites(summary: DreamSummary, mode: AiMode): PlannedWrite[] {
  const writes: PlannedWrite[] = [];
  for (const f of ["title", "summary", "description"] as const) {
    const p = summary.project[f];
    if (p.value) writes.push({ entity: "project", field: f, value: p.value, status: statusFor(p.basis) });
  }
  if (mode !== "AGENT") return writes;

  if (summary.project.category) writes.push({ entity: "project", field: "category", value: summary.project.category, status: "ANTAR" });
  if (summary.project.tags.length) writes.push({ entity: "project", field: "tags", value: summary.project.tags, status: "ANTAR" });
  if (summary.project.sdgGoals.length) writes.push({ entity: "project", field: "sdgGoals", value: summary.project.sdgGoals, status: "ANTAR" });
  for (const f of DREAM_CANVAS_FIELDS) {
    const p = summary.canvas[f];
    if (p?.value) writes.push({ entity: "leanCanvas", field: f, value: p.value, status: statusFor(p.basis) });
  }
  return writes;
}
