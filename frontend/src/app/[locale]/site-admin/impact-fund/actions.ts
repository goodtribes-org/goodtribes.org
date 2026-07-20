"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import { getImpactFundBalance } from "@/lib/impactFund";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);
  return session.user.id;
}

// PRD 5.50.4: opens a platform-wide GT-weighted vote over site-admin-nominated
// candidate projects for the Impact-fond's next round of startup capital —
// same election mechanics as Granskningsrådet (site-admin/council/actions.ts's
// createCouncilElection), reused for a different PlatformPoll type.
export async function openAllocationRound(formData: FormData) {
  const adminId = await requireAdmin();

  const raw = (formData.get("candidateSlugsRaw") as string | null) ?? "";
  const slugs = [...new Set(raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))];
  if (slugs.length === 0) return;

  const candidates = await prisma.project.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, title: true },
  });
  if (candidates.length === 0) return;

  const poll = await prisma.platformPoll.create({
    data: {
      title: "Impact-fonden: uppstartskapital nästa period",
      type: "impact_fund_allocation",
      createdById: adminId,
      options: {
        create: candidates.map((c) => ({ linkedProjectId: c.id, label: c.title })),
      },
    },
  });

  await prisma.impactFundAllocationRound.create({
    data: { pollId: poll.id, openedById: adminId },
  });

  revalidatePath("/site-admin/impact-fund");
  revalidatePath("/impact-fond");
}

// Closes voting. The tallied ranking becomes guidance for the Foundation's
// manual execute step below, not an automatic payout formula — PRD doesn't
// specify one; matches executeLegalTypeChange's human-judgment-after-a-vote
// shape rather than a rigid split.
export async function closeAllocationRound(pollId: string) {
  await requireAdmin();

  const round = await prisma.impactFundAllocationRound.findUnique({ where: { pollId } });
  if (!round || round.status !== "open") throw new Error("Round not open");

  await prisma.$transaction([
    prisma.platformPoll.update({ where: { id: pollId }, data: { status: "closed", closedAt: new Date() } }),
    prisma.impactFundAllocationRound.update({ where: { pollId }, data: { status: "closed" } }),
  ]);

  revalidatePath("/site-admin/impact-fund");
  revalidatePath("/impact-fond");
}

// Foundation's real-money execution of a closed round: one SEK amount per
// candidate project (informed by the vote ranking shown on the admin page),
// capped so the total never exceeds the fund's current balance.
export async function executeAllocationRound(pollId: string, formData: FormData) {
  const adminId = await requireAdmin();

  const round = await prisma.impactFundAllocationRound.findUnique({ where: { pollId } });
  if (!round || round.status !== "closed") throw new Error("Round not ready to execute");

  const poll = await prisma.platformPoll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });
  if (!poll) throw new Error("Poll not found");

  const amounts = poll.options
    .filter((o) => !!o.linkedProjectId)
    .map((o) => ({
      projectId: o.linkedProjectId!,
      amountSek: parseInt((formData.get(`amount_${o.id}`) as string | null) ?? "0", 10) || 0,
    }))
    .filter((a) => a.amountSek > 0);

  if (amounts.length === 0) return;

  const totalRequested = amounts.reduce((sum, a) => sum + a.amountSek, 0);
  const balance = await getImpactFundBalance();
  if (totalRequested > balance) throw new Error("Requested amount exceeds available balance");

  await prisma.$transaction([
    ...amounts.map((a) =>
      prisma.impactFundLedger.create({
        data: {
          direction: "out",
          amountSek: a.amountSek,
          targetProjectId: a.projectId,
          decidedByPollId: pollId,
          recordedById: adminId,
          note: "Uppstartskapital beslutat via GT-röstning (PRD 5.50.4)",
        },
      })
    ),
    prisma.impactFundAllocationRound.update({
      where: { pollId },
      data: { status: "executed", executedAt: new Date() },
    }),
  ]);

  revalidatePath("/site-admin/impact-fund");
  revalidatePath("/impact-fond");
}
