"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isProvenanceField, setFieldKnowledgeStatus } from "@/lib/fieldProvenance";

// Toggle a field between "vet" (known) and "antar" (assumed). Same people
// who may edit the canvases (project leads) may mark what's known.
export async function setFieldStatus(projectSlug: string, entity: string, field: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isProvenanceField(entity, field)) throw new Error("Okänt fält");
  if (status !== "VET" && status !== "ANTAR") throw new Error("Ogiltig status");

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  await setFieldKnowledgeStatus(project.id, entity, field, status, session.user.id);
  revalidatePath(`/projects/${projectSlug}`, "layout");
}

// "Ser bra ut" on an AI draft: someone in the team has read it and takes it
// as their own without rewriting it. Marks it AI_EDITED — the same as
// editing it — so it no longer counts as unreviewed, and (per canAiWrite)
// the AI will no longer overwrite it. The vet/antar status is untouched:
// approving a draft doesn't make its content known. Only for a field whose
// current author really is AI; anything else is a no-op.
export async function approveAiDraft(projectSlug: string, entity: string, field: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isProvenanceField(entity, field)) throw new Error("Okänt fält");

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  await prisma.fieldProvenance.updateMany({
    where: { projectId: project.id, entity, field, author: "AI" },
    data: { author: "AI_EDITED", updatedById: session.user.id },
  });
  revalidatePath(`/projects/${projectSlug}`, "layout");
}
