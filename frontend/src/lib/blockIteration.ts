import { namesAreGrounded } from "@/lib/grounding";
import type { BlockIterationMode } from "@/lib/prompts/blockIteration";

// Pure helpers for "Förbättra" on one canvas block (see
// lib/actions/blockIteration.ts for the server action). Kept free of
// Prisma/auth so the parsing and grounding rules are unit-testable.

export type IterationAnswer = { question: string; answer: string };

// Which model each mode uses. Rewording and asking are short, tightly
// constrained outputs — Haiku is enough, and these are the calls a team
// repeats most. Writing from the user's own answers is the one open-ended
// step, so it gets Sonnet. Costs are charged per call by the weighted AI
// budget (lib/aiCost.ts), which is what makes offering this per block safe.
export const ITERATION_MODEL: Record<BlockIterationMode, string> = {
  sharpen: "claude-haiku-4-5",
  simplify: "claude-haiku-4-5",
  challenge: "claude-haiku-4-5",
  ask: "claude-haiku-4-5",
  fromAnswers: "claude-sonnet-4-6",
};

export const MAX_ANSWER_LENGTH = 1000;
const MAX_QUESTIONS = 3;

// Modes that rewrite the field need something to rewrite; "ask" is the
// entry point for an empty field.
export function modeNeedsContent(mode: BlockIterationMode): boolean {
  return mode === "sharpen" || mode === "simplify" || mode === "challenge";
}

export function cleanAnswers(raw: unknown): IterationAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is IterationAnswer => typeof a?.question === "string" && typeof a?.answer === "string")
    .map((a) => ({ question: a.question.trim().slice(0, 300), answer: a.answer.trim().slice(0, MAX_ANSWER_LENGTH) }))
    .filter((a) => a.question && a.answer)
    .slice(0, MAX_QUESTIONS);
}

// "Hitta aldrig på fakta", enforced the same way as Kritikern: anything the
// model says it named must appear in what it was given.
export function parseSuggestion(input: unknown, source: string): { text: string; note: string | null } | null {
  const o = (input ?? {}) as { text?: unknown; note?: unknown; names?: unknown };
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) return null;
  if (!namesAreGrounded(o.names, source)) return null;
  const note = typeof o.note === "string" && o.note.trim() ? o.note.trim() : null;
  return { text, note };
}

export function parseQuestions(input: unknown, source: string): string[] {
  const o = (input ?? {}) as { questions?: unknown; names?: unknown };
  if (!namesAreGrounded(o.names, source)) return [];
  const qs = Array.isArray(o.questions) ? o.questions : [];
  return qs.filter((q): q is string => typeof q === "string" && !!q.trim()).map((q) => q.trim()).slice(0, MAX_QUESTIONS);
}

// What the model gets as context: the project, every other filled field
// (as "Label: text"), then the field in focus and — for fromAnswers — the
// user's answers.
export function buildIterationContent(p: {
  projectTitle: string;
  projectSummary: string | null;
  otherFields: { label: string; value: string }[];
  fieldLabel: string;
  fieldValue: string | null;
  answers?: IterationAnswer[];
}): string {
  const parts = [`Projekt: ${p.projectTitle}`];
  if (p.projectSummary?.trim()) parts.push(`Beskrivning: ${p.projectSummary.trim()}`);
  if (p.otherFields.length) parts.push("Övriga fält i canvasen:\n" + p.otherFields.map((f) => `- ${f.label}: ${f.value}`).join("\n"));
  parts.push(`FÄLTET I FOKUS — ${p.fieldLabel}:\n${p.fieldValue?.trim() || "(tomt)"}`);
  if (p.answers?.length) parts.push("Initiativtagarens svar:\n" + p.answers.map((a) => `F: ${a.question}\nS: ${a.answer}`).join("\n\n"));
  return parts.join("\n\n");
}
