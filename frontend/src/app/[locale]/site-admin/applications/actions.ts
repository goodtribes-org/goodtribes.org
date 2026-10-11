"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";
import { createNotification } from "@/lib/notify";
import { canReviewFor } from "@/lib/fundingCalls/review";

// GoodTribes' review of an application in one of its entities' names
// (#346): confirm identity and roles, then decide — always with a reason.

async function loadForReview(applicationId: string) {
  const userId = await requireAdminSession();
  const app = await prisma.fundingApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true, status: true,
      project: { select: { id: true, slug: true, title: true } },
      fundingCall: { select: { title: true } },
      applicantEntity: { select: { reviewers: { select: { id: true } } } },
      reviews: { where: { level: "IDENTITY", result: "OK" }, select: { id: true } },
    },
  });
  if (!app || app.status !== "in_review") return { error: "Ansökan väntar inte på granskning" } as const;
  // requireAdminSession passed, so this user is a site admin.
  if (!canReviewFor(app.applicantEntity?.reviewers.map((r) => r.id) ?? [], userId, true)) return { error: "Du är inte granskare för den sökande enheten" } as const;
  return { app, userId } as const;
}

export async function confirmIdentity(applicationId: string, motivation: string): Promise<{ error?: string }> {
  const loaded = await loadForReview(applicationId);
  if ("error" in loaded) return { error: loaded.error };
  if (!motivation.trim()) return { error: "Skriv hur identitet och roller är bekräftade" };
  await prisma.applicationReview.create({ data: { applicationId, level: "IDENTITY", result: "OK", motivation: motivation.trim().slice(0, 2000), reviewerId: loaded.userId } });
  revalidatePath("/site-admin/applications");
  return {};
}

const OUTCOME = { OK: "approved", CHANGES: "changes_requested", REJECTED: "review_rejected" } as const;
const WORDS = { OK: "godkänd", CHANGES: "skickad tillbaka med ändringar", REJECTED: "avslagen" } as const;

export async function decide(applicationId: string, result: "OK" | "CHANGES" | "REJECTED", motivation: string): Promise<{ error?: string }> {
  const loaded = await loadForReview(applicationId);
  if ("error" in loaded) return { error: loaded.error };
  if (!motivation.trim()) return { error: "Skriv en motivering" };
  if (result === "OK" && !loaded.app.reviews.length) return { error: "Bekräfta identitet och roller innan du godkänner" };
  await prisma.$transaction([
    prisma.applicationReview.create({ data: { applicationId, level: "HUMAN", result, motivation: motivation.trim().slice(0, 4000), reviewerId: loaded.userId } }),
    prisma.fundingApplication.update({ where: { id: applicationId }, data: { status: OUTCOME[result], ...(result === "OK" ? { approvedById: loaded.userId, approvedAt: new Date() } : {}) } }),
  ]);
  const leads = await prisma.projectMember.findMany({ where: { projectId: loaded.app.project.id, role: { in: ["FOUNDER", "ADMIN"] } }, select: { userId: true } });
  for (const l of leads) {
    await createNotification({
      userId: l.userId,
      type: "application_reviewed",
      title: `Ansökan till ”${loaded.app.fundingCall?.title ?? "utlysningen"}” är ${WORDS[result]}`,
      body: motivation.trim().slice(0, 300),
      url: `/projects/${loaded.app.project.slug}/funding-applications`,
    });
  }
  revalidatePath("/site-admin/applications");
  revalidatePath(`/projects/${loaded.app.project.slug}/funding-applications`);
  return {};
}
