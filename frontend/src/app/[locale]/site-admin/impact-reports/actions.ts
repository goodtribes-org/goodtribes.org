"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { createNotification } from "@/lib/notify";
import { PENDING_REPORT_WHERE } from "@/lib/impactReports";

// The Foundation's decision on a project's claimed SDG outcome (PRD 4d).
// Verification is what turns a self-reported number into something a funder,
// municipality or partner can rely on, so it deliberately sits with
// site-admin staff rather than with the project itself. Moving it to
// Granskningsrådet later is a one-line swap to requireCouncilMember/
// requireEthicsReviewer — nothing else here assumes siteRole.

async function loadPendingReport(reportId: string) {
  const report = await prisma.impactReport.findUnique({
    where: { id: reportId },
    include: { project: { select: { slug: true, title: true } } },
  });
  if (!report) throw new Error("Impact report not found");
  if (report.verifiedAt || report.rejectedAt) throw new Error("Impact report already reviewed");
  return report;
}

function revalidateAfterReview(projectSlug: string) {
  revalidatePath("/site-admin/impact-reports");
  revalidatePath(`/projects/${projectSlug}/impact`);
  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath("/hall-of-impact");
}

export async function verifyImpactReport(reportId: string, note: string) {
  const adminId = await requireAdminSession();
  const report = await loadPendingReport(reportId);

  // Guarded on the pending filter as well as the read above, so two admins
  // acting on the same queue at once can't both record a decision.
  const { count } = await prisma.impactReport.updateMany({
    where: { id: reportId, ...PENDING_REPORT_WHERE },
    data: {
      verifiedById: adminId,
      verifiedAt: new Date(),
      reviewNote: note.trim() || null,
    },
  });
  if (count === 0) throw new Error("Impact report already reviewed");

  if (report.createdById) {
    await createNotification({
      userId: report.createdById,
      type: "impact_report_verified",
      title: `Impact-rapport verifierad — ${report.project.title}`,
      body: report.metricDescription,
      url: `/projects/${report.project.slug}/impact`,
    });
  }

  revalidateAfterReview(report.project.slug);
}

export async function rejectImpactReport(reportId: string, note: string) {
  const adminId = await requireAdminSession();
  const report = await loadPendingReport(reportId);

  const trimmedNote = note.trim();
  // A rejection without a reason is useless to the project — it can't fix
  // what it isn't told, and the note is the only feedback channel here.
  if (!trimmedNote) throw new Error("En motivering krävs vid avslag");

  // verifiedById doubles as "who reviewed this" on a rejection — verifiedAt
  // stays null, so impactReportStatus() still reads this as rejected and the
  // report card never renders it as a verifier.
  const { count } = await prisma.impactReport.updateMany({
    where: { id: reportId, ...PENDING_REPORT_WHERE },
    data: {
      verifiedById: adminId,
      rejectedAt: new Date(),
      reviewNote: trimmedNote,
    },
  });
  if (count === 0) throw new Error("Impact report already reviewed");

  if (report.createdById) {
    await createNotification({
      userId: report.createdById,
      type: "impact_report_rejected",
      title: `Impact-rapport ej godkänd — ${report.project.title}`,
      body: trimmedNote,
      url: `/projects/${report.project.slug}/impact`,
    });
  }

  revalidateAfterReview(report.project.slug);
}
