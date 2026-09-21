"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { AI_TOOL_KEYS, isKnownAiToolKey, type AiToolKey } from "@/lib/aiToolKeys";
import type { AiMode, AiAgentScope } from "@prisma/client";

// Every known tool's current preference for a project, defaulting to
// MANUAL/TASK for any tool that has no row yet -- a project starts with
// every AI-capable tool off, per the "not the standard mode" requirement.
export async function getToolAiPreferences(
  projectSlug: string
): Promise<Record<AiToolKey, { aiMode: AiMode; agentScope: AiAgentScope }>> {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  const rows = project
    ? await prisma.toolAiPreference.findMany({ where: { projectId: project.id } })
    : [];
  const byKey = new Map(rows.map((r) => [r.toolKey, r]));

  const result = {} as Record<AiToolKey, { aiMode: AiMode; agentScope: AiAgentScope }>;
  for (const { key } of AI_TOOL_KEYS) {
    const row = byKey.get(key);
    result[key] = { aiMode: row?.aiMode ?? "MANUAL", agentScope: row?.agentScope ?? "TASK" };
  }
  return result;
}

// Cheap single-tool lookup for call sites that just need to know whether to
// run in agent mode -- e.g. the kanban AI agent route.
export async function getToolAiMode(
  projectSlug: string,
  toolKey: AiToolKey
): Promise<{ aiMode: AiMode; agentScope: AiAgentScope }> {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { aiMode: "MANUAL", agentScope: "TASK" };
  const row = await prisma.toolAiPreference.findUnique({
    where: { projectId_toolKey: { projectId: project.id, toolKey } },
  });
  return { aiMode: row?.aiMode ?? "MANUAL", agentScope: row?.agentScope ?? "TASK" };
}

export async function setToolAiMode(
  projectSlug: string,
  toolKey: string,
  aiMode: AiMode,
  agentScope: AiAgentScope
) {
  if (!isKnownAiToolKey(toolKey)) throw new Error("Unknown AI tool key");

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  await prisma.toolAiPreference.upsert({
    where: { projectId_toolKey: { projectId: project.id, toolKey } },
    create: { projectId: project.id, toolKey, aiMode, agentScope, updatedById: userId },
    update: { aiMode, agentScope, updatedById: userId },
  });

  revalidatePath(`/projects/${projectSlug}/ai-review`);
}
