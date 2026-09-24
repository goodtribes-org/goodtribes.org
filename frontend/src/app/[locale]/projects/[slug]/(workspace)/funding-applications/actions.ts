"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getAiClientFor, aiGateMessage } from "@/lib/aiMode";
import { logger } from "@/lib/logger";
import { enqueueProjectUpdatedFundingMatch } from "@/lib/fundingMatching";

export async function setEstimatedFundingNeed(projectSlug: string, amountSek: number | null) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(projectSlug, session.user.id);

  await prisma.project.update({ where: { id: project.id }, data: { estimatedFundingNeedSek: amountSek } });
  void enqueueProjectUpdatedFundingMatch(project.id);

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

async function requireLead(projectSlug: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, title: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  return project;
}

export async function startApplication(projectSlug: string, fundingSourceId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const project = await requireLead(projectSlug, userId);

  const source = await prisma.fundingSource.findUnique({ where: { id: fundingSourceId }, select: { nextDeadline: true } });
  if (!source) throw new Error("Finansieringskällan hittades inte");

  await prisma.fundingApplication.create({
    data: {
      projectId: project.id,
      fundingSourceId,
      deadline: source.nextDeadline,
      createdById: userId,
    },
  });

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

export async function dismissMatch(matchId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireLead(projectSlug, session.user.id);

  await prisma.fundingMatch.update({
    where: { id: matchId },
    data: { dismissedAt: new Date(), dismissedById: session.user.id },
  });

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

// AI drafts the application from the project's Lean Canvas/Värdeerbjudande
// data -- gated through getAiClientFor (the "funding-applications" tool
// setting, or the step/phase/project AI mode). Human-triggered (a button, not automatic), and per-application
// only: there is deliberately no "draft all my applications" action.
export async function requestAiDraft(applicationId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const project = await requireLead(projectSlug, userId);

  // AI writes the whole draft — "agent" (only in AGENT mode).
  const gate = await getAiClientFor({ feature: "funding-applications", kind: "agent", userId, projectId: project.id });
  if (!gate.ok) {
    if (gate.reason === "mode") throw new Error("AI-läge är avstängt för bidragsansökningar i det här projektet");
    throw new Error(aiGateMessage(gate.reason));
  }
  const { client } = gate;

  const application = await prisma.fundingApplication.findUnique({
    where: { id: applicationId },
    include: { fundingSource: true },
  });
  if (!application || application.projectId !== project.id) throw new Error("Ansökan hittades inte");

  const [leanCanvas, valueProposition] = await Promise.all([
    prisma.leanCanvas.findUnique({ where: { projectSlug } }),
    prisma.valueProposition.findUnique({ where: { projectSlug } }),
  ]);

  const context = `Projekt: ${project.title}

Social Lean Canvas:
- Syfte: ${leanCanvas?.purpose ?? "Ej ifyllt"}
- Jobs to be done: ${leanCanvas?.jobsToBeDone ?? "Ej ifyllt"}${leanCanvas?.problem ? `\n- Problem (från tidigare canvas): ${leanCanvas.problem}` : ""}
- Lösning: ${leanCanvas?.solution ?? "Ej ifyllt"}
- Unikt värdeerbjudande: ${leanCanvas?.uniqueValueProposition ?? "Ej ifyllt"}
- Kundsegment: ${leanCanvas?.customerSegments ?? "Ej ifyllt"}
- Impact: ${leanCanvas?.impact ?? "Ej ifyllt"}

Värdeerbjudande:
- Kundens jobb: ${valueProposition?.vpJobs ?? "Ej ifyllt"}
- Kundens smärtpunkter: ${valueProposition?.vpPains ?? "Ej ifyllt"}
- Kundens vinster: ${valueProposition?.vpGains ?? "Ej ifyllt"}

Finansieringskälla: ${application.fundingSource.name} (${application.fundingSource.organization ?? ""})
Finansieringskällans beskrivning: ${application.fundingSource.description ?? "Ej angiven"}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system:
        "Du är en erfaren bidragsansökningsskribent för svenska ideella och kommersiella impact-projekt. Skriv ett komplett utkast till bidragsansökan i markdown-format, baserat på projektets Lean Canvas och värdeerbjudande. Var konkret, undvik floskler, och anpassa tonen efter finansiärens beskrivning.",
      messages: [{ role: "user", content: context }],
    });
    const draftMarkdown = message.content[0].type === "text" ? message.content[0].text : "";

    await prisma.fundingApplication.update({
      where: { id: applicationId },
      data: { draftMarkdown, draftGeneratedAt: new Date(), status: "ai_drafted" },
    });
  } catch (err) {
    logger.error("funding-applications: AI draft failed", { applicationId, err: String(err) });
    throw new Error("AI-utkastet misslyckades — försök igen");
  }

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

// Approval is always per application -- there is no "approve all future
// drafts" setting anywhere in this file, deliberately.
export async function approveDraftForSubmission(applicationId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireLead(projectSlug, session.user.id);

  await prisma.fundingApplication.update({
    where: { id: applicationId },
    data: { status: "ready_for_review", approvedById: session.user.id, approvedAt: new Date() },
  });

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

// A human clicks this after actually submitting the application themselves
// (e.g. through a BankID-gated portal) -- no API integration exists for
// that common case, so GoodTribes never submits on anyone's behalf.
export async function markSubmitted(applicationId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireLead(projectSlug, session.user.id);

  await prisma.fundingApplication.update({
    where: { id: applicationId },
    data: { status: "submitted", submittedById: session.user.id, submittedAt: new Date() },
  });

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

export async function recordOutcome(
  applicationId: string,
  projectSlug: string,
  outcome: "awarded" | "rejected",
  outcomeAmountSek: number | null,
  outcomeNote: string
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireLead(projectSlug, session.user.id);

  await prisma.fundingApplication.update({
    where: { id: applicationId },
    data: {
      status: outcome,
      outcome,
      outcomeAmountSek,
      outcomeNote: outcomeNote.trim() || null,
      decidedAt: new Date(),
    },
  });

  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}
