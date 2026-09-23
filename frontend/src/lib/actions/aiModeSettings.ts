"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AiMode } from "@prisma/client";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { DISPLAY_PHASES, INITIATIVE_CHECKLIST_ITEMS } from "@/lib/projectPhase";
import type { DisplayPhase } from "@/lib/aiMode";

const MODES: readonly AiMode[] = ["AGENT", "ASSIST", "MANUAL"];
const PHASES: readonly string[] = DISPLAY_PHASES.map((p) => p.value);
const STEP_KEYS: ReadonlySet<string> = new Set(
  Object.values(INITIATIVE_CHECKLIST_ITEMS).flatMap((items) => items.map((i) => i.key)),
);

function assertMode(mode: string): asserts mode is AiMode {
  if (!MODES.includes(mode as AiMode)) throw new Error("Ogiltigt AI-läge");
}

// Only the project's leads (initiativtagare/admins) choose the project's and
// the phases' AI modes, same as every other project setting. Returns the
// caller's id for the audit fields.
async function requireProjectLead(projectSlug: string): Promise<{ projectId: string; userId: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  return { projectId: project.id, userId: session.user.id };
}

function revalidateProject(projectSlug: string) {
  revalidatePath(`/projects/${projectSlug}/edit`);
  revalidatePath(`/projects/${projectSlug}/guide`);
}

// Changing a mode never touches existing content — it only decides what AI
// may do from now on.
export async function setProjectAiMode(projectSlug: string, mode: string) {
  assertMode(mode);
  const { projectId } = await requireProjectLead(projectSlug);
  await prisma.project.update({ where: { id: projectId }, data: { aiMode: mode } });
  revalidateProject(projectSlug);
}

// mode = null removes the override, so the phase inherits the project mode.
export async function setPhaseAiMode(projectSlug: string, phase: string, mode: string | null) {
  if (!PHASES.includes(phase)) throw new Error("Ogiltig fas");
  const { projectId, userId } = await requireProjectLead(projectSlug);
  const displayPhase = phase as DisplayPhase;
  if (mode === null) {
    await prisma.projectPhaseAiSetting.deleteMany({ where: { projectId, phase: displayPhase } });
  } else {
    assertMode(mode);
    await prisma.projectPhaseAiSetting.upsert({
      where: { projectId_phase: { projectId, phase: displayPhase } },
      create: { projectId, phase: displayPhase, aiMode: mode, updatedById: userId },
      update: { aiMode: mode, updatedById: userId },
    });
  }
  revalidateProject(projectSlug);
}

// mode = null removes the override, so the step inherits the phase/project mode.
export async function setStepAiMode(projectSlug: string, stepKey: string, mode: string | null) {
  if (!STEP_KEYS.has(stepKey)) throw new Error("Okänt steg");
  const { projectId, userId } = await requireProjectLead(projectSlug);
  if (mode === null) {
    await prisma.projectStepAiSetting.deleteMany({ where: { projectId, stepKey } });
  } else {
    assertMode(mode);
    await prisma.projectStepAiSetting.upsert({
      where: { projectId_stepKey: { projectId, stepKey } },
      create: { projectId, stepKey, aiMode: mode, updatedById: userId },
      update: { aiMode: mode, updatedById: userId },
    });
  }
  revalidateProject(projectSlug);
}

export async function setAiProjectManager(projectSlug: string, enabled: boolean) {
  const { projectId } = await requireProjectLead(projectSlug);
  await prisma.project.update({ where: { id: projectId }, data: { aiProjectManager: enabled } });
  revalidateProject(projectSlug);
}
