import type { FundingApplicantType, LegalType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerOutboxHandler, enqueueOutboxEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notify";
import { logger } from "@/lib/logger";
import { isCommercialLegalType } from "@/lib/legalType";
import { compactKr } from "./public";

// Utlysningar (#345): which existing projects a published call fits, by
// rules — free, so it can run for every call and project. The reasons are
// the motivation the leads see ("Samma globala mål: 11, 13 …"); no AI is
// needed to say why. Runs when a call is published and when a project's
// funding details change (funding.projectUpdated in fundingMatching.ts).

type CallForMatch = { sdgGoals: number[]; applicantTypes: FundingApplicantType[]; amountMinSek: number | null; amountMaxSek: number | null };
type ProjectForMatch = { sdgGoals: number[]; legalType: LegalType; estimatedFundingNeedSek: number | null };

// The reasons a call fits a project, or null when it doesn't. A call with no
// SDGs set matches nothing: "everything fits" would only be noise.
export function callMatchReasons(call: CallForMatch, project: ProjectForMatch): string[] | null {
  const shared = call.sdgGoals.filter((g) => project.sdgGoals.includes(g));
  if (!shared.length) return null;
  const reasons = [`Samma globala mål: ${shared.join(", ")}`];

  if (call.applicantTypes.length) {
    const own: FundingApplicantType = isCommercialLegalType(project.legalType) ? "COMPANY" : "NONPROFIT";
    if (call.applicantTypes.includes(own)) reasons.push(own === "COMPANY" ? "Företag får söka" : "Ideella organisationer får söka");
    else if (call.applicantTypes.includes("CONSORTIUM")) reasons.push("Går att söka tillsammans med andra i ett konsortium");
    else return null;
  }

  const need = project.estimatedFundingNeedSek;
  if (need != null && (call.amountMinSek != null || call.amountMaxSek != null)) {
    if ((call.amountMinSek != null && need < call.amountMinSek) || (call.amountMaxSek != null && need > call.amountMaxSek)) return null;
    reasons.push(`Beloppet passar ert behov på ${compactKr(need)}`);
  }
  return reasons;
}

const PROJECT_SELECT = { id: true, slug: true, title: true, sdgGoals: true, legalType: true, estimatedFundingNeedSek: true } satisfies Prisma.ProjectSelect;
const CALL_SELECT = {
  id: true, slug: true, title: true, deadline: true, rolling: true, sdgGoals: true, applicantTypes: true, amountMinSek: true, amountMaxSek: true,
  fundingSource: { select: { name: true } },
} satisfies Prisma.FundingCallSelect;
type MatchProject = Prisma.ProjectGetPayload<{ select: typeof PROJECT_SELECT }>;
type MatchCall = Prisma.FundingCallGetPayload<{ select: typeof CALL_SELECT }>;

// Live projects that can still apply for something.
const ACTIVE_PROJECT = { hiddenAt: null, archivedAt: null } satisfies Prisma.ProjectWhereInput;

export function closesIn(deadline: Date | null, now = Date.now()): string {
  if (!deadline) return "Löpande ansökan";
  const days = Math.max(0, Math.ceil((deadline.getTime() - now) / 86_400_000));
  return days >= 14 ? `Stänger om ${Math.round(days / 7)} veckor` : `Stänger om ${days} ${days === 1 ? "dag" : "dagar"}`;
}

// New match → a row and one notice to the leads; an existing one is left.
async function recordCallMatch(call: MatchCall, project: MatchProject, reasons: string[]) {
  const existing = await prisma.fundingCallMatch.findUnique({ where: { fundingCallId_projectId: { fundingCallId: call.id, projectId: project.id } }, select: { id: true } });
  if (existing) return;
  await prisma.fundingCallMatch.create({ data: { fundingCallId: call.id, projectId: project.id, reasons, notifiedAt: new Date() } });
  const leads = await prisma.projectMember.findMany({ where: { projectId: project.id, role: { in: ["FOUNDER", "ADMIN"] } }, select: { userId: true } });
  for (const lead of leads) {
    await createNotification({
      userId: lead.userId,
      type: "funding_call_match",
      title: `${project.title} passar utlysningen ”${call.title}” från ${call.fundingSource.name}`,
      body: `${closesIn(call.rolling ? null : call.deadline)}. ${reasons.join(". ")}.`,
      url: `/projects/${project.slug}/funding-applications`,
    });
  }
}

async function tryRecord(call: MatchCall, project: MatchProject) {
  const reasons = callMatchReasons(call, project);
  if (!reasons) return;
  try {
    await recordCallMatch(call, project, reasons);
  } catch (err) {
    logger.error("funding-calls matching: failed to record match", { fundingCallId: call.id, projectId: project.id, err: String(err) });
  }
}

export async function enqueueCallPublishedMatch(fundingCallId: string) {
  await enqueueOutboxEvent(prisma, "funding.callPublished", { fundingCallId });
}

registerOutboxHandler("funding.callPublished", async (payload) => {
  const { fundingCallId } = payload as { fundingCallId: string };
  const call = await prisma.fundingCall.findFirst({ where: { id: fundingCallId, status: "PUBLISHED" }, select: CALL_SELECT });
  if (!call || !call.sdgGoals.length) return;
  const projects = await prisma.project.findMany({ where: { ...ACTIVE_PROJECT, sdgGoals: { hasSome: call.sdgGoals } }, select: PROJECT_SELECT });
  for (const project of projects) await tryRecord(call, project);
});

// Called from funding.projectUpdated: the project against every open call.
export async function matchProjectAgainstCalls(projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, ...ACTIVE_PROJECT }, select: PROJECT_SELECT });
  if (!project?.sdgGoals.length) return;
  const calls = await prisma.fundingCall.findMany({
    where: { status: "PUBLISHED", sdgGoals: { hasSome: project.sdgGoals }, OR: [{ rolling: true }, { deadline: { gt: new Date() } }] },
    select: CALL_SELECT,
  });
  for (const call of calls) await tryRecord(call, project);
}
