"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isCouncilMember } from "@/lib/authz";
import { getGtBalance } from "@/lib/tokens";

const RESPONSE_WINDOW_HOURS = 72;

// --- Election: candidacy & voting -----------------------------------------

export async function selfNominate(pollId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const poll = await prisma.platformPoll.findUnique({ where: { id: pollId } });
  if (!poll || poll.type !== "council_election" || poll.status !== "open") {
    return { error: "Election not open" };
  }

  const existing = await prisma.platformPollOption.findFirst({ where: { pollId, candidateId: userId } });
  if (existing) return { error: "Already nominated" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  await prisma.platformPollOption.create({
    data: { pollId, candidateId: userId, label: user?.name ?? "Okänd" },
  });

  revalidatePath("/granskningsradet");
  return { success: true };
}

export async function castCouncilVote(pollId: string, allocations: { optionId: string; weight: number }[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const userId = session.user.id;

  const poll = await prisma.platformPoll.findUnique({ where: { id: pollId } });
  if (!poll) return { error: "Poll not found" };
  if (poll.status !== "open") return { error: "Poll is closed" };
  if (poll.deadline && new Date() > poll.deadline) return { error: "Deadline has passed" };

  // Same floor-of-1 convention as the project-scoped Tribe Token polls
  // (castVote in projects/[slug]/(workspace)/polls/actions.ts) — everyone
  // gets at least a symbolic vote regardless of GT contribution so far.
  const gtBalance = Math.max(await getGtBalance(userId), 1);
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight > gtBalance) return { error: "Insufficient GT balance" };

  await prisma.platformPollVote.deleteMany({ where: { pollId, userId } });
  if (allocations.length > 0) {
    await prisma.platformPollVote.createMany({
      data: allocations.map((a) => ({ pollId, pollOptionId: a.optionId, userId, gtWeight: a.weight })),
    });
  }

  revalidatePath("/granskningsradet");
  return { success: true };
}

// --- Exclusion cases: report, respond, decide ------------------------------

export async function createExclusionCase(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const reportedUserId = (formData.get("reportedUserId") as string | null)?.trim();
  const reason = (formData.get("reason") as string | null)?.trim();
  const projectId = (formData.get("projectId") as string | null)?.trim() || null;

  if (!reportedUserId || !reason) return { error: "Missing fields" };
  if (reportedUserId === session.user.id) return { error: "Cannot report yourself" };

  await prisma.exclusionCase.create({
    data: { reportedUserId, reportedById: session.user.id, projectId, reason },
  });

  revalidatePath("/granskningsradet/arenden");
  return { success: true };
}

export async function submitCaseResponse(caseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const exclusionCase = await prisma.exclusionCase.findUnique({ where: { id: caseId } });
  if (!exclusionCase) return { error: "Case not found" };
  if (exclusionCase.reportedUserId !== session.user.id) return { error: "Forbidden" };
  if (exclusionCase.status === "resolved") return { error: "Case already resolved" };

  const responseText = (formData.get("responseText") as string | null)?.trim();
  if (!responseText) return { error: "Response required" };

  await prisma.exclusionCase.update({
    where: { id: caseId },
    data: { responseText, respondedAt: new Date() },
  });

  revalidatePath(`/granskningsradet/arenden/${caseId}`);
  return { success: true };
}

// A council member moves the case into voting by proposing a decision.
// Only allowed once the reported party has responded, or the response
// window has elapsed (PRD 5.53: right to respond before a decision, but
// not an indefinite veto over ever reaching one).
export async function proposeDecision(caseId: string, decision: "none" | "warning" | "project_ban" | "platform_ban") {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  if (!(await isCouncilMember(session.user.id))) return { error: "Forbidden" };

  const exclusionCase = await prisma.exclusionCase.findUnique({ where: { id: caseId } });
  if (!exclusionCase) return { error: "Case not found" };
  if (exclusionCase.status !== "open") return { error: "Case is not open" };

  const responseWindowElapsed =
    Date.now() - exclusionCase.createdAt.getTime() > RESPONSE_WINDOW_HOURS * 60 * 60 * 1000;
  if (!exclusionCase.respondedAt && !responseWindowElapsed) {
    return { error: "Waiting for the reported user's response window to elapse" };
  }

  await prisma.exclusionCase.update({
    where: { id: caseId },
    data: { status: "under_review", proposedDecision: decision },
  });

  revalidatePath(`/granskningsradet/arenden/${caseId}`);
  return { success: true };
}

async function executeDecision(exclusionCase: { id: string; reportedUserId: string; projectId: string | null; decision: string | null }) {
  if (exclusionCase.decision === "platform_ban") {
    await prisma.user.update({ where: { id: exclusionCase.reportedUserId }, data: { suspendedAt: new Date() } });
  } else if (exclusionCase.decision === "project_ban" && exclusionCase.projectId) {
    await prisma.projectMember.deleteMany({
      where: { projectId: exclusionCase.projectId, userId: exclusionCase.reportedUserId },
    });
  } else if (exclusionCase.decision === "warning") {
    await prisma.notification.create({
      data: {
        userId: exclusionCase.reportedUserId,
        type: "exclusion_case_warning",
        title: "Du har fått en varning från Granskningsrådet",
        body: "Se ärendet för mer information.",
        url: `/granskningsradet/arenden/${exclusionCase.id}`,
      },
    }).catch(() => {});
  }
}

// Casts a council member's approve/reject vote on the case's current
// proposal. Majority approve (of currently-active council members)
// finalizes the decision and runs its side effect; majority reject
// reverts the case to `open` for a fresh proposal.
export async function castExclusionVote(caseId: string, vote: "approve" | "reject", reasoning?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const councilMemberId = session.user.id;
  if (!(await isCouncilMember(councilMemberId))) return { error: "Forbidden" };

  const exclusionCase = await prisma.exclusionCase.findUnique({ where: { id: caseId } });
  if (!exclusionCase || exclusionCase.status !== "under_review" || !exclusionCase.proposedDecision) {
    return { error: "Case is not awaiting a vote" };
  }

  await prisma.exclusionCaseVote.upsert({
    where: { caseId_councilMemberId: { caseId, councilMemberId } },
    create: { caseId, councilMemberId, vote, reasoning: reasoning ?? null },
    update: { vote, reasoning: reasoning ?? null },
  });

  const [activeCouncilCount, votes] = await Promise.all([
    prisma.reviewCouncilMember.count({ where: { termEnd: { gt: new Date() } } }),
    prisma.exclusionCaseVote.findMany({ where: { caseId } }),
  ]);
  const approveCount = votes.filter((v) => v.vote === "approve").length;
  const rejectCount = votes.filter((v) => v.vote === "reject").length;
  const majority = Math.floor(activeCouncilCount / 2) + 1;

  if (approveCount >= majority) {
    const decided = await prisma.exclusionCase.update({
      where: { id: caseId },
      data: {
        status: "resolved",
        decision: exclusionCase.proposedDecision,
        decidedAt: new Date(),
        decisionReasoning: votes.map((v) => v.reasoning).filter(Boolean).join(" | ") || null,
      },
    });
    await executeDecision(decided);
  } else if (rejectCount >= majority) {
    await prisma.$transaction([
      prisma.exclusionCaseVote.deleteMany({ where: { caseId } }),
      prisma.exclusionCase.update({ where: { id: caseId }, data: { status: "open", proposedDecision: null } }),
    ]);
  }

  revalidatePath(`/granskningsradet/arenden/${caseId}`);
  revalidatePath("/granskningsradet/arenden");
  return { success: true };
}
