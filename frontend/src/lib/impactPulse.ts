import type { ProjectPhase } from "@prisma/client";

// Impactpuls (#335): impact is built while you do the work, not written
// afterwards. Once a month, from Lansering on, the team gets one reminder in
// "Att göra": "Hur gick det den här månaden?" — a sentence, a photo and/or a
// figure, in 30 seconds. Pure: Att göra, the pulse page and the tests read
// the same rules. The reminder is computed when the list is shown, no cron.

// Lansering (enum PRODUCTION) and every phase after it.
export const PULSE_PHASES: ProjectPhase[] = ["PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"];
// One reminder per project and month: none until this long after the last answer.
export const PULSE_INTERVAL_DAYS = 30;
// "Påminn mig om en vecka".
export const PULSE_SNOOZE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export type PulseRow = { note: string | null; imageUrl: string | null; impactUpdateId: string | null; snoozedUntil: Date | null; createdAt: Date };

// An answer has something in it; a snooze row has only snoozedUntil.
export function isAnswer(p: Pick<PulseRow, "note" | "imageUrl" | "impactUpdateId">): boolean {
  return !!p.note?.trim() || !!p.imageUrl || !!p.impactUpdateId;
}

// Whether the project's team should see the reminder now. `rows` are the
// project's pulse rows in any order.
export function pulseDue(phase: ProjectPhase, rows: PulseRow[], now: number): boolean {
  if (!PULSE_PHASES.includes(phase)) return false;
  const lastAnswer = Math.max(0, ...rows.filter(isAnswer).map((r) => r.createdAt.getTime()));
  if (lastAnswer && now - lastAnswer < PULSE_INTERVAL_DAYS * DAY) return false;
  const snoozed = Math.max(0, ...rows.map((r) => r.snoozedUntil?.getTime() ?? 0));
  return snoozed <= now;
}

// Earliest rows a reminder decision needs: the interval or the snooze,
// whichever reaches further back.
export function pulseLookback(now: number): Date {
  return new Date(now - Math.max(PULSE_INTERVAL_DAYS, PULSE_SNOOZE_DAYS) * DAY);
}

export function snoozeUntil(now: number): Date {
  return new Date(now + PULSE_SNOOZE_DAYS * DAY);
}

// Parse the figure field ("12", "12,5"); null when empty, NaN when not a number.
export function parsePulseValue(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  return Number(s.replace(/\s/g, "").replace(",", "."));
}
