import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import { logger } from "@/lib/logger";

// Utlysningar (#345): reminders to an application project's leads as the
// call's deadline nears. Run daily with the import.
//
// ÖPPEN FRÅGA (#342): how many days before the deadline. Default 30, 14
// and 3; set FUNDING_CALL_REMINDER_DAYS="30,14,3" to change.
export function reminderDays(): number[] {
  const raw = process.env.FUNDING_CALL_REMINDER_DAYS;
  const days = (raw ? raw.split(",") : ["30", "14", "3"]).map((d) => Number(d.trim())).filter((d) => Number.isInteger(d) && d > 0);
  return [...new Set(days)].sort((a, b) => b - a);
}

const DAY = 24 * 60 * 60 * 1000;

// The reminder due now, as the new stage (how many thresholds are passed),
// or null. Jumps straight to the latest threshold passed, so a project that
// starts late gets one reminder, not one a day until it has caught up.
export function nextReminderStage(daysLeft: number, stage: number, thresholds: number[]): number | null {
  let passed = 0;
  thresholds.forEach((d, i) => {
    if (daysLeft <= d) passed = i + 1;
  });
  return passed > stage ? passed : null;
}

export async function remindFundingCallDeadlines(now = Date.now()): Promise<number> {
  const thresholds = reminderDays();
  const projects = await prisma.project.findMany({
    where: {
      fundingCallId: { not: null },
      hiddenAt: null,
      archivedAt: null,
      fundingCallReminderStage: { lt: thresholds.length },
      fundingCall: { status: "PUBLISHED", rolling: false, deadline: { gt: new Date(now) } },
    },
    select: { id: true, slug: true, title: true, fundingCallReminderStage: true, fundingCall: { select: { title: true, deadline: true, fundingSource: { select: { name: true } } } } },
  });
  let sent = 0;
  for (const p of projects) {
    try {
      const daysLeft = Math.ceil((p.fundingCall!.deadline!.getTime() - now) / DAY);
      const stage = nextReminderStage(daysLeft, p.fundingCallReminderStage, thresholds);
      if (stage === null) continue;
      const leads = await prisma.projectMember.findMany({ where: { projectId: p.id, role: { in: ["FOUNDER", "ADMIN"] } }, select: { userId: true } });
      for (const lead of leads) {
        await createNotification({
          userId: lead.userId,
          type: "funding_call_deadline",
          title: `${daysLeft} ${daysLeft === 1 ? "dag" : "dagar"} kvar till ansökan hos ${p.fundingCall!.fundingSource.name}`,
          body: `${p.title}: ”${p.fundingCall!.title}”. GoodTribes behöver granska ansökan innan den skickas in, så lämna den till granskning i god tid.`,
          url: `/projects/${p.slug}/funding-applications`,
        });
      }
      await prisma.project.update({ where: { id: p.id }, data: { fundingCallReminderStage: stage } });
      sent++;
    } catch (err) {
      logger.error("funding-call reminder failed", { projectId: p.id, err: String(err) });
    }
  }
  return sent;
}

// A published call's deadline changed at the source: its application
// projects hear about it, and the reminders start over from the new date.
export async function notifyDeadlineChanged(fundingCallId: string, title: string, deadline: Date | null) {
  const projects = await prisma.project.findMany({ where: { fundingCallId, hiddenAt: null, archivedAt: null }, select: { id: true, slug: true } });
  const when = deadline ? new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" }).format(deadline) : "ingen deadline";
  for (const p of projects) {
    await prisma.project.update({ where: { id: p.id }, data: { fundingCallReminderStage: 0 } });
    const leads = await prisma.projectMember.findMany({ where: { projectId: p.id, role: { in: ["FOUNDER", "ADMIN"] } }, select: { userId: true } });
    for (const lead of leads) {
      await createNotification({
        userId: lead.userId,
        type: "funding_call_changed",
        title: `Ny deadline för ”${title}”`,
        body: `Finansiären har ändrat deadline till ${when}.`,
        url: `/projects/${p.slug}/funding-applications`,
      });
    }
  }
}
