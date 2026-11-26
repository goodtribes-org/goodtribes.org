"use server";

import type { CoachLevel } from "@prisma/client";
import { auth } from "@/auth";
import { coachTurn, getCoachState, setCoachLevel as saveCoachLevel, type CoachState, type CoachTurnResult } from "@/lib/coach";

// Coachen (#367) — the conversation panel's coach thread. The person is
// always taken from the session, never from the client.

const LEVELS: CoachLevel[] = ["OFF", "CALM", "DIRECT", "PUSHY"];
const LOCALES = ["sv", "en"];

async function me(): Promise<string | null> {
  return (await auth())?.user?.id ?? null;
}

export async function loadCoach(): Promise<CoachState | null> {
  const userId = await me();
  return userId ? getCoachState(userId) : null;
}

/** The panel opened: the coach may take the initiative if it's been a while. */
export async function openCoach(locale: string): Promise<CoachTurnResult> {
  const userId = await me();
  if (!userId) return { ok: false, reason: "unavailable" };
  return coachTurn(userId, null, LOCALES.includes(locale) ? locale : "sv");
}

export async function sendToCoach(text: string, locale: string): Promise<CoachTurnResult> {
  const userId = await me();
  if (!userId || typeof text !== "string") return { ok: false, reason: "unavailable" };
  return coachTurn(userId, text, LOCALES.includes(locale) ? locale : "sv");
}

export async function changeCoachLevel(level: CoachLevel): Promise<CoachState | null> {
  const userId = await me();
  if (!userId || !LEVELS.includes(level)) return null;
  await saveCoachLevel(userId, level);
  return getCoachState(userId);
}
