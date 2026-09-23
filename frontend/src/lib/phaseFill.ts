import type { Prisma, ProjectPhase } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Shared status handling for the AI's background drafting on a phase's
// one-page overview (Uppstart, Lansering, …), stored in PhaseFill as
// { <section>: "pending" | "running" | "done" | "failed" | "skipped" }.

export type PhaseFillState = "pending" | "running" | "done" | "failed" | "skipped";

const STATES: readonly string[] = ["pending", "running", "done", "failed", "skipped"];
const STALE_AFTER_MS = 5 * 60_000;

// A section still waiting long after the last update was cut short
// (restart, hung request) and shows as failed so the page stops waiting
// and offers a retry — same rule as the Idé fill.
export function parsePhaseFillStatus<S extends string>(
  raw: unknown,
  sections: readonly S[],
  updatedAt?: Date,
  now = Date.now(),
): Partial<Record<S, PhaseFillState>> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const stale = updatedAt ? now - updatedAt.getTime() >= STALE_AFTER_MS : false;
  const out: Partial<Record<S, PhaseFillState>> = {};
  for (const s of sections) {
    const v = o[s];
    if (typeof v !== "string" || !STATES.includes(v)) continue;
    out[s] = stale && (v === "pending" || v === "running") ? "failed" : (v as PhaseFillState);
  }
  return out;
}

export function isPhaseFillInProgress(status: Partial<Record<string, PhaseFillState>>): boolean {
  return Object.values(status).some((s) => s === "pending" || s === "running");
}

// Atomic per-key update — sections run in parallel.
export async function setPhaseFillState(projectId: string, phase: ProjectPhase, section: string, state: PhaseFillState) {
  await prisma.$executeRaw`
    UPDATE "PhaseFill"
    SET "status" = "status" || jsonb_build_object(${section}::text, ${state}::text), "updatedAt" = NOW()
    WHERE "projectId" = ${projectId} AND "phase" = ${phase}::"ProjectPhase"`;
}

// Marks the given sections pending (keeping the others' state).
export async function markPhaseFillPending(projectId: string, phase: ProjectPhase, sections: readonly string[]) {
  const pending = Object.fromEntries(sections.map((s) => [s, "pending"])) as Prisma.InputJsonObject;
  const existing = await prisma.phaseFill.findUnique({ where: { projectId_phase: { projectId, phase } } });
  await prisma.phaseFill.upsert({
    where: { projectId_phase: { projectId, phase } },
    create: { projectId, phase, status: pending },
    update: { status: { ...((existing?.status as Prisma.JsonObject | null) ?? {}), ...pending } },
  });
}
