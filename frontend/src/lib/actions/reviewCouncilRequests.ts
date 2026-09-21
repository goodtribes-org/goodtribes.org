"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { hasProjectRole, PROJECT_LEAD_ROLES, requireCouncilMember } from "@/lib/authz";

// ReviewCouncilRequest is Granskningsrådets proactive counterpart to
// ExclusionCase (which is reactive, filed against a reported user) -- a
// project-initiated request for a deep review ahead of scaling (checklist
// item review_council_deep_review, ESTABLISH phase, see projectPhase.ts).
// v1 is a single assigned council member's write-up, not a full
// ExclusionCaseVote-style vote -- both sides (project + council) call into
// this shared file, same reasoning as partnerships.ts.

export async function requestCouncilReview(projectSlug: string, note: string | null) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  const existing = await prisma.reviewCouncilRequest.findFirst({
    where: { projectId: project.id, status: { in: ["pending", "in_review"] } },
  });
  if (existing) throw new Error("Det finns redan en pågående granskningsbegäran för det här projektet");

  await prisma.reviewCouncilRequest.create({
    data: { projectId: project.id, requestedById: userId, note: note?.trim() || null },
  });

  await logActivity(project.id, userId, "review_council_requested");
  revalidatePath(`/projects/${projectSlug}/review-request`);
}

export async function assignReviewRequest(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireCouncilMember(session.user.id);

  await prisma.reviewCouncilRequest.update({
    where: { id: requestId },
    data: { status: "in_review", assignedCouncilMemberId: session.user.id },
  });

  revalidatePath("/granskningsradet/forfragningar");
}

export async function completeReviewRequest(requestId: string, outcomeNote: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireCouncilMember(session.user.id);

  const request = await prisma.reviewCouncilRequest.update({
    where: { id: requestId },
    data: {
      status: "completed",
      outcomeNote: outcomeNote.trim() || null,
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
    select: { requestedById: true, project: { select: { title: true, slug: true } } },
  });

  await createNotification({
    userId: request.requestedById,
    type: "review_council_completed",
    title: `Granskningsrådet har slutfört granskningen av ${request.project.title}`,
    url: `/projects/${request.project.slug}/review-request`,
  });

  revalidatePath("/granskningsradet/forfragningar");
}

export async function declineReviewRequest(requestId: string, outcomeNote: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireCouncilMember(session.user.id);

  const request = await prisma.reviewCouncilRequest.update({
    where: { id: requestId },
    data: {
      status: "declined",
      outcomeNote: outcomeNote.trim() || null,
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
    select: { requestedById: true, project: { select: { title: true, slug: true } } },
  });

  await createNotification({
    userId: request.requestedById,
    type: "review_council_declined",
    title: `Granskningsrådet kunde inte genomföra granskningen av ${request.project.title}`,
    url: `/projects/${request.project.slug}/review-request`,
  });

  revalidatePath("/granskningsradet/forfragningar");
}
