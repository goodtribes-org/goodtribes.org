"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { IMPACT_MODEL_FIELDS, type ImpactModelField } from "./fields";
import { recordHumanEdits } from "@/lib/fieldProvenance";
import { aiGateMessage, getAiClientFor } from "@/lib/aiMode";
import { buildTranscript, fillImpactModel } from "@/lib/ideaFill";
import { logger } from "@/lib/logger";

export async function updateImpactModelBlock(
  projectSlug: string,
  field: ImpactModelField,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!IMPACT_MODEL_FIELDS.includes(field)) return;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return;
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return;

  const value = (formData.get("value") as string | null)?.trim() || null;
  const before = await prisma.impactModel.findUnique({ where: { projectSlug }, select: { [field]: true } });
  await prisma.impactModel.upsert({
    where: { projectSlug },
    create: { projectSlug, [field]: value, updatedById: session.user.id },
    update: { [field]: value, updatedById: session.user.id },
  });

  await recordHumanEdits(project.id, "impactModel", before, { [field]: value }, session.user.id);

  revalidatePath(`/projects/${projectSlug}`, "layout");
}

// "Låt AI:n föreslå en impactmodell": for projects that didn't get one from
// the Idé fill (created before the impact model existed, or it failed).
// Follows the canvas step's AI mode like everything else: AGENT fills empty
// steps (never overwriting a human), ASSIST only puts suggestions next to
// them, MANUAL makes no call at all.
export async function draftImpactModelWithAi(
  projectSlug: string,
): Promise<{ written: number; suggested: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, title: true, summary: true, description: true, dreamConversation: { select: { roomId: true } } },
  });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Bara projektledare kan göra det här." };

  const gate = await getAiClientFor({
    feature: "impact-model",
    kind: "assist",
    userId: session.user.id,
    projectId: project.id,
    stepKey: "lean_canvas_created",
    language: "project",
  });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };

  const transcript = project.dreamConversation ? await buildTranscript(project.dreamConversation.roomId) : "";
  const context =
    `Projekt: ${project.title}\nSammanfattning: ${project.summary ?? ""}\nBeskrivning: ${(project.description ?? "").replace(/<[^>]*>/g, " ")}` +
    (transcript ? `\n\nDrömsamtalet:\n${transcript}` : "");

  try {
    const { written, proposed } = await fillImpactModel(gate.client, { projectId: project.id, projectSlug, mode: gate.mode, context });
    if (!proposed) return { error: "AI:n hittade inte tillräckligt underlag. Fyll i Syfte och Impact på canvasen först." };
    revalidatePath(`/projects/${projectSlug}`, "layout");
    return { written, suggested: proposed - written };
  } catch (err) {
    logger.error("impact-model: AI draft failed", { projectSlug, err: String(err) });
    return { error: "Kunde inte ta fram ett förslag just nu. Försök igen." };
  }
}
