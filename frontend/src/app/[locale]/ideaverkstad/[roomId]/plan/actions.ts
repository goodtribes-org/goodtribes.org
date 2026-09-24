"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRoomAccess } from "@/lib/roomAuth";
import { sendRoomMessage } from "@/app/[locale]/messages/actions";
import { getAiClientFor, aiGateMessage } from "@/lib/aiMode";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { createProjectRecord } from "@/lib/createProject";
import { logger } from "@/lib/logger";

const MAX_REVISIONS = 3; // same cap as ai-agent/review's revision branch

// coercePlanShape below guarantees every field here is a real (possibly
// empty) string, never null/undefined -- unlike the LeanCanvas/
// ValueProposition Prisma models themselves, whose columns are nullable.
type PlanJson = {
  project: { title: string; summary: string; description: string; category: string; tags: string[]; sdgGoals: number[] };
  leanCanvas: {
    purpose: string; impact: string; jobsToBeDone: string; solution: string; keyMetrics: string;
    uniqueValueProposition: string; unfairAdvantage: string; channels: string; customerSegments: string;
    costStructure: string; revenueStreams: string;
  };
  valueProposition: { vpJobs: string; vpPains: string; vpGains: string; vpProducts: string; vpRelievers: string; vpCreators: string };
  initialTasks: { title: string; description: string }[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Manual shape check, same convention as mindmap/generate/route.ts — no
// zod anywhere in this codebase. Lenient: any missing/wrong-typed field
// just becomes an empty string/array rather than failing the whole parse,
// since a partially-filled plan is still useful to show a human for review.
function coercePlanShape(raw: unknown): PlanJson {
  const o = (raw ?? {}) as Record<string, unknown>;
  const project = (o.project ?? {}) as Record<string, unknown>;
  const leanCanvas = (o.leanCanvas ?? {}) as Record<string, unknown>;
  const valueProposition = (o.valueProposition ?? {}) as Record<string, unknown>;
  const initialTasks = Array.isArray(o.initialTasks) ? o.initialTasks : [];

  return {
    project: {
      title: str(project.title),
      summary: str(project.summary),
      description: str(project.description),
      category: str(project.category),
      tags: Array.isArray(project.tags) ? project.tags.filter((t): t is string => typeof t === "string") : [],
      sdgGoals: Array.isArray(project.sdgGoals) ? project.sdgGoals.filter((n): n is number => typeof n === "number") : [],
    },
    leanCanvas: {
      purpose: str(leanCanvas.purpose), impact: str(leanCanvas.impact), jobsToBeDone: str(leanCanvas.jobsToBeDone),
      solution: str(leanCanvas.solution), keyMetrics: str(leanCanvas.keyMetrics),
      uniqueValueProposition: str(leanCanvas.uniqueValueProposition), unfairAdvantage: str(leanCanvas.unfairAdvantage),
      channels: str(leanCanvas.channels), customerSegments: str(leanCanvas.customerSegments),
      costStructure: str(leanCanvas.costStructure), revenueStreams: str(leanCanvas.revenueStreams),
    },
    valueProposition: {
      vpJobs: str(valueProposition.vpJobs), vpPains: str(valueProposition.vpPains), vpGains: str(valueProposition.vpGains),
      vpProducts: str(valueProposition.vpProducts), vpRelievers: str(valueProposition.vpRelievers), vpCreators: str(valueProposition.vpCreators),
    },
    initialTasks: initialTasks
      .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
      .map((t) => ({ title: str(t.title), description: str(t.description) }))
      .filter((t) => t.title.length > 0)
      .slice(0, 10),
  };
}

const PLAN_SYSTEM_PROMPT = `Du analyserar en konversation mellan en AI-coach och en person som vill starta ett projekt på GoodTribes.org.
Utifrån HELA konversationen, skriv ett komplett förslag till projektplan.
Svara ENBART med giltig JSON (ingen markdown, inga kodblock, ingen förklaringstext) i exakt denna form:
{"project":{"title":"","summary":"","description":"","category":"","tags":[],"sdgGoals":[]},"leanCanvas":{"purpose":"","impact":"","jobsToBeDone":"","solution":"","keyMetrics":"","uniqueValueProposition":"","unfairAdvantage":"","channels":"","customerSegments":"","costStructure":"","revenueStreams":""},"valueProposition":{"vpJobs":"","vpPains":"","vpGains":"","vpProducts":"","vpRelievers":"","vpCreators":""},"initialTasks":[{"title":"","description":""}]}
leanCanvas är en Social Lean Canvas (socialleancanvas.com): purpose är syftet, impact förändringsteorin, jobsToBeDone vad kunderna försöker få gjort, unfairAdvantage fördelen som är svår att kopiera. sdgGoals ska vara siffror 1-17 för FN:s globala mål som är relevanta. initialTasks ska vara 3-6 konkreta första uppgifter för att komma igång. Skriv på svenska.`;

export async function generateAiProjectPlan(roomId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const access = await getRoomAccess(roomId, userId);
  if (!access || access.room.type !== "AI_INTAKE" || !access.canPost) throw new Error("Forbidden");

  // No project exists yet, so only configuration and the rate limit apply.
  // The plan is a draft the user reviews before anything is created.
  const gate = await getAiClientFor({ feature: "project-plan", kind: "assist", userId, projectId: null });
  if (!gate.ok) throw new Error(aiGateMessage(gate.reason));
  const { client } = gate;

  const history = await prisma.message.findMany({
    where: { roomId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });
  const threadMessages = history.map((m) => ({
    role: (m.isAi ? "assistant" : "user") as "assistant" | "user",
    content: `${m.author.name ?? "Någon"}: ${m.body.replace(/<[^>]*>/g, "").trim()}`,
  }));
  // The API requires the last message to have role "user" -- but in AI_INTAKE,
  // triggerAiThreadReply already answered the latest user turn by the time this
  // runs, so the reconstructed history often already ends with "assistant".
  // Appending an explicit final instruction keeps this valid regardless of
  // where in the back-and-forth the human clicked "Skapa min plan".
  threadMessages.push({ role: "user", content: "Skapa nu ett planförslag enligt formatet i systeminstruktionen, baserat på hela konversationen ovan." });

  let plan: PlanJson;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: PLAN_SYSTEM_PROMPT,
      messages: threadMessages,
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    plan = coercePlanShape(JSON.parse(text.trim()));
  } catch (err) {
    logger.error("ai-project-plan: generation failed", { roomId, err: String(err) });
    throw new Error("Kunde inte skapa ett planförslag — försök igen");
  }

  const existing = await prisma.aiProjectPlan.findUnique({ where: { roomId } });
  if (existing && existing.revisionCount >= MAX_REVISIONS) {
    throw new Error("Max antal omarbetningar nått — kontakta gärna GoodTribes för manuell hjälp istället");
  }

  await prisma.aiProjectPlan.upsert({
    where: { roomId },
    create: { roomId, createdById: userId, planJson: plan },
    update: { planJson: plan, revisionCount: { increment: 1 }, status: "pending" },
  });

  revalidatePath(`/ideaverkstad/${roomId}/plan`);
  redirect(`/ideaverkstad/${roomId}/plan`);
}

// A human clicks this to send a revision request back into the chat, then
// re-generate — kept as two explicit steps (post the message, then the
// caller calls generateAiProjectPlan again) rather than one action, so the
// revision request is visible in the conversation history like anything
// else the human says.
export async function requestPlanRevision(roomId: string, note: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await sendRoomMessage(roomId, `<p>${note.replace(/</g, "&lt;")}</p>`);
  await generateAiProjectPlan(roomId);
}

// Approval is a bounded, one-time scaffolding act — the ongoing multi-phase
// journey afterward runs through Paket B's ToolAiPreference/agentScope
// mechanism (set below when continueWithAi is true), with its own
// per-card AiTaskRun -> REVIEW -> human-approval gate, unchanged.
//
// Not one atomic $transaction end-to-end: createProjectRecord is a shared
// utility (also used by the main creation form, sandbox flow, and the AI
// sandbox-seed cron) that isn't transaction-client-aware, so project
// creation happens as its own step first, then the canvas/tasks/room-link
// writes happen together in a second transaction. A failure between the two
// would leave a bare Project row with no canvas/tasks — judged an
// acceptable, narrow risk for a first version rather than refactoring a
// shared utility's signature for this one caller.
export async function approveAiProjectPlan(planId: string, roomId: string, continueWithAi: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const access = await getRoomAccess(roomId, userId);
  if (!access || access.room.type !== "AI_INTAKE" || !access.canPost) throw new Error("Forbidden");

  const planRow = await prisma.aiProjectPlan.findUnique({ where: { id: planId } });
  if (!planRow || planRow.roomId !== roomId || planRow.status !== "pending") throw new Error("Planen hittades inte");

  const plan = planRow.planJson as unknown as PlanJson;
  const aiUser = await getAiParticipantUser();

  const project = await createProjectRecord({
    title: plan.project.title || "Nytt projekt",
    ownerId: userId,
    summary: plan.project.summary || null,
    description: plan.project.description || null,
    category: plan.project.category || null,
    tags: plan.project.tags,
    sdgGoals: plan.project.sdgGoals,
  });

  // Empty strings -> null to match every other LeanCanvas/ValueProposition
  // write path's "unfilled means null, not an empty string" convention.
  const nullIfEmpty = <T extends Record<string, string>>(obj: T): { [K in keyof T]: string | null } =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v || null])) as { [K in keyof T]: string | null };

  await prisma.$transaction([
    prisma.leanCanvas.create({ data: { projectSlug: project.slug, updatedById: userId, ...nullIfEmpty(plan.leanCanvas) } }),
    prisma.valueProposition.create({ data: { projectSlug: project.slug, updatedById: userId, ...nullIfEmpty(plan.valueProposition) } }),
    ...(plan.initialTasks.length > 0
      ? [
          prisma.kanbanCard.createMany({
            data: plan.initialTasks.map((t) => ({
              projectSlug: project.slug,
              title: t.title,
              description: t.description || null,
              createdById: aiUser.id,
              createdByAi: true,
            })),
          }),
        ]
      : []),
    prisma.room.update({ where: { id: roomId }, data: { convertedToProjectId: project.id } }),
    prisma.aiProjectPlan.update({
      where: { id: planId },
      data: { status: "approved", createdProjectSlug: project.slug, decidedById: userId, decidedAt: new Date() },
    }),
    ...(continueWithAi
      ? [
          prisma.toolAiPreference.create({
            data: { projectId: project.id, toolKey: "kanban-agent", aiMode: "AGENT", agentScope: "ALL", updatedById: userId },
          }),
        ]
      : []),
  ]);

  redirect(`/projects/${project.slug}`);
}
