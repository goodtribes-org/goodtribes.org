import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logger } from "@/lib/logger";

// Called daily by an external scheduler, same Authorization: Bearer
// <CRON_SECRET> convention as every other /api/cron/* route — fails closed
// (503) when the secret isn't configured rather than skipping the check.
//
// Escalates a FundingApplication's deadline at 14/7/3/1 days left, once per
// threshold (deadlineEscalationStage only ever moves forward, never reset),
// so a slow-moving draft doesn't quietly miss its deadline unnoticed.
const THRESHOLDS_DAYS = [14, 7, 3, 1];

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const applications = await prisma.fundingApplication.findMany({
    where: {
      status: { in: ["draft", "ai_drafted", "ready_for_review"] },
      deadline: { not: null, gte: now },
      deadlineEscalationStage: { lt: THRESHOLDS_DAYS.length },
    },
    include: {
      fundingSource: { select: { name: true } },
      project: { select: { slug: true, title: true } },
    },
  });

  let escalated = 0;
  const failed: string[] = [];

  for (const application of applications) {
    try {
      const daysLeft = Math.ceil((application.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const nextStage = THRESHOLDS_DAYS.findIndex((d, i) => i >= application.deadlineEscalationStage && daysLeft <= d);
      if (nextStage === -1) continue;

      const leads = await prisma.projectMember.findMany({
        where: { projectId: application.projectId, role: { in: ["FOUNDER", "ADMIN"] } },
        select: { userId: true },
      });
      for (const lead of leads) {
        await createNotification({
          userId: lead.userId,
          type: "funding_deadline_approaching",
          title: `${daysLeft} dagar kvar: ${application.fundingSource.name} (${application.project.title})`,
          url: `/projects/${application.project.slug}/funding-applications`,
        });
      }

      await prisma.fundingApplication.update({
        where: { id: application.id },
        data: { deadlineEscalationStage: nextStage + 1 },
      });
      escalated++;
    } catch (err) {
      logger.error("funding-deadline-check: failed to escalate", { applicationId: application.id, err: String(err) });
      failed.push(application.id);
    }
  }

  return NextResponse.json({ ok: true, escalated, failed });
}
