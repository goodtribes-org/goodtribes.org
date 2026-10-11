"use server";

import { auth } from "@/auth";
import { wrapUntrusted } from "@/lib/untrusted";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { getAiClientFor, aiGateMessage } from "@/lib/aiMode";
import { logger } from "@/lib/logger";
import { enqueueProjectUpdatedFundingMatch } from "@/lib/fundingMatching";
import { createNotification } from "@/lib/notify";
import { completenessFindings, needsGoodTribesReview, reviewLeadDays, suggestEntity } from "@/lib/fundingCalls/review";

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
  if (LOCKED_BY_REVIEW.includes(application.status)) throw new Error("Ansökan ligger hos GoodTribes granskning och kan inte skrivas om nu");

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
      messages: [{ role: "user", content: wrapUntrusted("projektets material", context) }],
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
  const project = await requireLead(projectSlug, session.user.id);

  // Scoped to the project and to a draft, so it can't pull an application
  // out of GoodTribes' review (#346).
  await prisma.fundingApplication.updateMany({
    where: { id: applicationId, projectId: project.id, status: { in: ["draft", "ai_drafted"] } },
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
  const project = await requireLead(projectSlug, session.user.id);

  // #346: never submitted in a GoodTribes entity's name without an approved
  // human review — and a call application must say who applies.
  const app = await prisma.fundingApplication.findFirst({
    where: { id: applicationId, projectId: project.id },
    select: { status: true, fundingCallId: true, applicantEntity: { select: { kind: true } } },
  });
  if (!app) throw new Error("Ansökan hittades inte");
  if (app.fundingCallId && !app.applicantEntity) throw new Error("Välj vem som står som sökande först");
  if (needsGoodTribesReview(app.applicantEntity) && app.status !== "approved") {
    throw new Error("Ansökan ska lämnas in i en GoodTribes-enhets namn och måste godkännas i GoodTribes granskning först");
  }

  await prisma.fundingApplication.update({
    where: { id: applicationId, projectId: project.id },
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
  const project = await requireLead(projectSlug, session.user.id);

  // Only a submitted application has an outcome (#346).
  await prisma.fundingApplication.updateMany({
    where: { id: applicationId, projectId: project.id, status: "submitted" },
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

// Utlysningar (#345): hide a matching call for this project.
export async function dismissCallMatch(matchId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(projectSlug, session.user.id);
  await prisma.fundingCallMatch.updateMany({ where: { id: matchId, projectId: project.id }, data: { dismissedAt: new Date(), dismissedById: session.user.id } });
  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

// ─── Utlysningar (#346): an application to a funding call ───────────────────

// Start the application for a call this project applies to (or that fits
// it). The applicant entity is suggested from who may apply; the review
// approves the choice.
export async function startCallApplication(projectSlug: string, fundingCallId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(projectSlug, session.user.id);
  const call = await prisma.fundingCall.findFirst({
    where: { id: fundingCallId, status: "PUBLISHED" },
    select: { id: true, fundingSourceId: true, deadline: true, applicantTypes: true },
  });
  if (!call) throw new Error("Utlysningen är inte öppen");
  const existing = await prisma.fundingApplication.findFirst({ where: { projectId: project.id, fundingCallId: call.id }, select: { id: true } });
  if (existing) return;
  const entities = await prisma.commercialUmbrellaEntity.findMany({ select: { id: true, kind: true, status: true, applicantTypes: true } });
  await prisma.fundingApplication.create({
    data: {
      projectId: project.id,
      fundingSourceId: call.fundingSourceId,
      fundingCallId: call.id,
      deadline: call.deadline,
      applicantEntityId: suggestEntity(call.applicantTypes, entities),
      createdById: session.user.id,
    },
  });
  revalidatePath(`/projects/${projectSlug}/funding-applications`);
}

const EDITABLE = ["draft", "ai_drafted", "changes_requested"] as const;
// While GoodTribes reviews it, or once approved, nothing may rewrite it.
const LOCKED_BY_REVIEW: string[] = ["in_review", "approved"];

export async function saveCallApplication(
  applicationId: string,
  projectSlug: string,
  input: { applicantEntityId: string; requirementsDone: string[]; amountRequestedSek: string; cofundingNote: string },
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(projectSlug, session.user.id);
  const app = await prisma.fundingApplication.findFirst({ where: { id: applicationId, projectId: project.id }, select: { status: true, fundingCall: { select: { requirements: true } } } });
  if (!app) return { error: "Ansökan hittades inte" };
  if (!(EDITABLE as readonly string[]).includes(app.status)) return { error: "Ansökan är skickad till granskning och kan inte ändras nu" };
  const entity = input.applicantEntityId ? await prisma.commercialUmbrellaEntity.findUnique({ where: { id: input.applicantEntityId }, select: { id: true } }) : null;
  const amount = input.amountRequestedSek.trim() ? Number(input.amountRequestedSek.replace(/\s/g, "")) : null;
  if (amount !== null && !(Number.isInteger(amount) && amount > 0)) return { error: "Beloppet ska vara ett heltal i kronor" };
  await prisma.fundingApplication.update({
    where: { id: applicationId },
    data: {
      applicantEntityId: entity?.id ?? null,
      requirementsDone: input.requirementsDone.filter((r) => app.fundingCall?.requirements.includes(r)),
      amountRequestedSek: amount,
      cofundingNote: input.cofundingNote.trim().slice(0, 1000) || null,
    },
  });
  revalidatePath(`/projects/${projectSlug}/funding-applications`);
  return {};
}

// Send to GoodTribes' review: the completeness check runs first and its
// findings come back as a list to work through; with none, the reviewers
// for the entity are told.
export async function requestReview(applicationId: string, projectSlug: string): Promise<{ error?: string; findings?: string[] }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await requireLead(projectSlug, session.user.id);
  const app = await prisma.fundingApplication.findFirst({
    where: { id: applicationId, projectId: project.id },
    include: {
      fundingCall: { select: { title: true, requirements: true, amountMinSek: true, amountMaxSek: true, cofunding: true, deadline: true } },
      applicantEntity: { select: { name: true, kind: true, status: true, reviewers: { select: { id: true } } } },
    },
  });
  if (!app?.fundingCall) return { error: "Ansökan hittades inte" };
  if (!(EDITABLE as readonly string[]).includes(app.status)) return { error: "Ansökan är redan skickad till granskning" };
  if (!needsGoodTribesReview(app.applicantEntity) && app.applicantEntity) return { error: "En partner som söker själv behöver ingen granskning av GoodTribes" };
  const findings = completenessFindings({
    requirements: app.fundingCall.requirements,
    requirementsDone: app.requirementsDone,
    amountRequestedSek: app.amountRequestedSek,
    amountMinSek: app.fundingCall.amountMinSek,
    amountMaxSek: app.fundingCall.amountMaxSek,
    cofunding: app.fundingCall.cofunding,
    cofundingNote: app.cofundingNote,
    deadline: app.fundingCall.deadline,
    entityChosen: !!app.applicantEntity,
    entityNotFormed: !!app.applicantEntity && app.applicantEntity.status !== "EXISTS",
    now: Date.now(),
    leadDays: reviewLeadDays(),
  });
  await prisma.applicationReview.create({ data: { applicationId: app.id, level: "CHECK", result: findings.length ? "CHANGES" : "OK", findings } });
  if (findings.length) {
    revalidatePath(`/projects/${projectSlug}/funding-applications`);
    return { findings };
  }
  await prisma.fundingApplication.update({ where: { id: app.id }, data: { status: "in_review", reviewRequestedAt: new Date() } });
  const reviewerIds = app.applicantEntity!.reviewers.length
    ? app.applicantEntity!.reviewers.map((r) => r.id)
    : (await prisma.user.findMany({ where: { siteRole: { in: ["ADMIN", "OWNER"] } }, select: { id: true } })).map((u) => u.id);
  for (const userId of reviewerIds) {
    await createNotification({
      userId,
      type: "application_review",
      title: `Ny ansökan att granska: ${project.title}`,
      body: `${app.fundingCall.title} · sökande ${app.applicantEntity!.name}`,
      url: "/site-admin/applications",
    });
  }
  revalidatePath(`/projects/${projectSlug}/funding-applications`);
  return {};
}
