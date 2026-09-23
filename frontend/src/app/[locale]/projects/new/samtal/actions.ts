"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { persistAiMessage } from "@/lib/aiThreadReply";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { isDreamComplete, parseDreamState, parseOpenQuestions, type DreamArea } from "@/lib/dreamConversation";
import { DREAM_OPENER } from "@/lib/prompts/dreamConversation";
import { escapeHtml } from "@/lib/renderBody";
import type { Prisma } from "@prisma/client";
import { getAiClientFor, aiGateMessage, resolveAiMode } from "@/lib/aiMode";
import { createProjectRecord } from "@/lib/createProject";
import { getFieldProvenance, recordAiWrite, type ProvenanceInfo } from "@/lib/fieldProvenance";
import { createAiSuggestion, decideAiPlacement } from "@/lib/aiSuggestions";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { coerceDreamSummary, planDreamWrites, type DreamSummary, type DreamSummarySections, type PlannedWrite } from "@/lib/dreamSummary";
import { DREAM_SUMMARY_SYSTEM_PROMPT, DREAM_SUMMARY_TOOL } from "@/lib/prompts/dreamConversation";
import { markChecklistDone } from "@/app/[locale]/projects/[slug]/guide/actions";

// A fixed opener, not an AI call — the first model call happens on the
// user's first reply (see triggerDreamReply).
async function postDreamOpener(roomId: string) {
  const aiUser = await getAiParticipantUser();
  const html = DREAM_OPENER.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  await persistAiMessage(roomId, html, aiUser.id);
}

async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// Vägval → "Låt AI:n göra jobbet" / "AI:n hjälper mig": starts a Drömsamtal.
// "Jag gör allt själv" never gets here — it goes straight to the manual
// Snabbstart. The chosen mode is stored now and becomes the project's
// aiMode once the summary is approved.
export async function startDreamConversation(mode: string) {
  const userId = await requireUser();
  if (!(await isAiProjectStartAvailable(userId))) redirect("/projects/new?manual=1");
  if (mode !== "AGENT" && mode !== "ASSIST") throw new Error("Ogiltigt val");

  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  // AI_INTAKE access is RoomParticipant-authoritative (see roomAuth.ts) —
  // only the initiativtagare can read or post.
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });
  await prisma.dreamConversation.create({ data: { roomId: room.id, userId, aiMode: mode } });

  await postDreamOpener(room.id);

  redirect(`/projects/new/samtal/${room.id}`);
}

// "Prata med AI:n" from Snabbstart: a Drömsamtal for a project that already
// exists. Its approval fills only fields AI may touch and turns the rest
// into suggestions (see approveDreamSummary). One conversation per project;
// a follow-up conversation at phase changes is a later step.
export async function startDreamConversationForProject(projectSlug: string) {
  const userId = await requireUser();
  if (!(await isAiProjectStartAvailable(userId))) redirect(`/projects/${projectSlug}/guide`);
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, dreamConversation: { select: { roomId: true } } },
  });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  if (project.dreamConversation) redirect(`/projects/new/samtal/${project.dreamConversation.roomId}`);

  // The conversation itself is "assist"-level help, so a MANUAL project
  // (or step) doesn't get it; AGENT stays AGENT, anything else assists.
  const { mode } = await resolveAiMode({ projectId: project.id, feature: "dream-conversation", stepKey: "dream_defined" });
  if (mode === "MANUAL") throw new Error("AI är avstängt i projektets AI-inställningar");

  const room = await prisma.room.create({ data: { type: "AI_INTAKE" } });
  await prisma.roomParticipant.create({ data: { roomId: room.id, userId } });
  await prisma.dreamConversation.create({
    data: { roomId: room.id, userId, aiMode: mode === "AGENT" ? "AGENT" : "ASSIST", projectId: project.id },
  });
  await postDreamOpener(room.id);
  redirect(`/projects/new/samtal/${room.id}`);
}

async function requireOwnDream(roomId: string, userId: string) {
  const dream = await prisma.dreamConversation.findUnique({ where: { roomId } });
  if (!dream || dream.userId !== userId) throw new Error("Samtalet hittades inte");
  return dream;
}

export type DreamProgress = {
  covered: DreamArea[];
  openQuestionCount: number;
  complete: boolean;
  status: string;
};

// Polled by the progress bar while the conversation page is open — the AI's
// reply (and its state update) arrives asynchronously after each message.
export async function getDreamProgress(roomId: string): Promise<DreamProgress> {
  const userId = await requireUser();
  const dream = await requireOwnDream(roomId, userId);
  const state = parseDreamState(dream.state);
  return {
    covered: state.covered,
    openQuestionCount: parseOpenQuestions(dream.openQuestions).length,
    complete: isDreamComplete(state),
    status: dream.status,
  };
}

// The conversation can contain personal information, so the initiativtagare
// can delete it outright: the room (and with it every message, the
// participant row and the DreamConversation row) is removed. A project
// already created from it is not affected.
export async function deleteDreamConversation(roomId: string) {
  const userId = await requireUser();
  await requireOwnDream(roomId, userId);
  await prisma.room.delete({ where: { id: roomId } });
  redirect("/projects/new");
}

// ─── "Så här förstod jag dig" and creating the project ──────────────────────

async function buildTranscript(roomId: string): Promise<string> {
  const history = await prisma.message.findMany({
    where: { roomId, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    select: { isAi: true, body: true },
  });
  return history
    .map((m) => `${m.isAi ? "Idécoachen" : "Initiativtagaren"}: ${m.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}`)
    .join("\n");
}

// Generates (or regenerates, after "det stämmer inte") the summary. Nothing
// is written to any project here — the summary just waits for approval.
export async function generateDreamSummary(roomId: string, correction?: string) {
  const userId = await requireUser();
  const dream = await requireOwnDream(roomId, userId);
  if (dream.status !== "in_progress" && dream.status !== "summary_pending") redirect(`/projects/new/samtal/${roomId}`);

  // A correction goes into the conversation itself, so it's part of the
  // history the next summary is built from (and visible if they go back).
  const note = correction?.trim();
  if (note) {
    await prisma.message.create({
      data: { roomId, authorId: userId, body: `<p>${escapeHtml(`Rättelse till sammanfattningen: ${note}`)}</p>` },
    });
  }

  const gate = await getAiClientFor({ feature: "dream-conversation", kind: "assist", userId, projectId: null });
  if (!gate.ok) throw new Error(aiGateMessage(gate.reason));

  const openQuestions = parseOpenQuestions(dream.openQuestions);
  const transcript = await buildTranscript(roomId);
  const response = await gate.client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: DREAM_SUMMARY_SYSTEM_PROMPT,
    tools: [DREAM_SUMMARY_TOOL],
    tool_choice: { type: "tool", name: DREAM_SUMMARY_TOOL.name },
    messages: [
      {
        role: "user",
        content:
          `Här är samtalet:\n\n${transcript}` +
          (openQuestions.length ? `\n\nÖppna frågor som noterats under samtalet: ${openQuestions.join("; ")}` : ""),
      },
    ],
  });
  const toolUse = response.content.find((b) => b.type === "tool_use");
  const summary = coerceDreamSummary(toolUse && toolUse.type === "tool_use" ? toolUse.input : null);
  if (!summary.project.title.value) throw new Error("Kunde inte sammanfatta samtalet — försök igen.");

  await prisma.dreamConversation.update({
    where: { id: dream.id },
    data: { summary: summary as unknown as Prisma.InputJsonValue, status: "summary_pending" },
  });
  redirect(`/projects/new/samtal/${roomId}/sammanfattning`);
}

// Back to the conversation from the summary page (e.g. to add something).
export async function reopenDreamConversation(roomId: string) {
  const userId = await requireUser();
  const dream = await requireOwnDream(roomId, userId);
  if (dream.status === "summary_pending") {
    await prisma.dreamConversation.update({ where: { id: dream.id }, data: { status: "in_progress" } });
  }
  redirect(`/projects/new/samtal/${roomId}`);
}

// The only step that writes anything. For a new project it creates the
// project from the approved (and possibly hand-edited) summary; for a
// conversation started from an existing project ("Prata med AI:n") it fills
// that project. Either way every field goes through decideAiPlacement:
// written as an AI draft only in AGENT mode and only where AI may write
// (empty or its own draft) — everything else becomes a suggestion next to
// the field. Nothing a human wrote is ever overwritten.
export async function approveDreamSummary(roomId: string, editedSections: DreamSummarySections) {
  const userId = await requireUser();
  const dream = await requireOwnDream(roomId, userId);
  if (!dream.summary) throw new Error("Det finns ingen sammanfattning att godkänna");
  const summary = coerceDreamSummaryStored(dream.summary);
  const sections = { ...summary.sections, ...trimSections(editedSections) };

  // Claim the conversation first so a double click can't apply it twice.
  const claimed = await prisma.dreamConversation.updateMany({
    where: { id: dream.id, status: "summary_pending" },
    data: { status: "confirmed" },
  });
  if (claimed.count !== 1) throw new Error("Sammanfattningen är redan godkänd");

  // Not one transaction end to end: createProjectRecord is shared and not
  // transaction-aware (same trade-off as approveAiProjectPlan), so a failure
  // after it leaves a bare project; the claim is released so the user can
  // retry.
  try {
    const mode = dream.aiMode;
    const proposals = planDreamWrites(summary, "AGENT"); // everything the summary proposes
    let project: { id: string; slug: string };
    const current: Record<string, Record<string, unknown>> = { project: {}, leanCanvas: {} };

    if (dream.projectId) {
      const existing = await prisma.project.findUnique({
        where: { id: dream.projectId },
        select: {
          id: true, slug: true, title: true, summary: true, description: true, category: true, tags: true, sdgGoals: true,
          weeklyHours: true, teamMode: true, ambition: true, leanCanvas: true,
        },
      });
      if (!existing) throw new Error("Projektet hittades inte");
      if (!(await hasProjectRole(existing.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
      project = existing;
      current.project = existing;
      current.leanCanvas = existing.leanCanvas ?? {};
    } else {
      // A new project needs its name, summary and description up front
      // (planDreamWrites puts these first in every mode).
      const initial = planDreamWrites(summary, mode).filter((w) => w.entity === "project");
      const value = (f: string) => initial.find((w) => w.field === f)?.value;
      project = await createProjectRecord({
        title: (value("title") as string | undefined) ?? "Nytt projekt",
        ownerId: userId,
        summary: (value("summary") as string | undefined) ?? null,
        description: descriptionHtml((value("description") as string | undefined) ?? sections.dream),
        category: (value("category") as string | undefined) ?? null,
        tags: (value("tags") as string[] | undefined) ?? [],
        sdgGoals: (value("sdgGoals") as number[] | undefined) ?? [],
      });
      for (const w of initial) current.project[w.field] = w.value; // already written, as AI drafts
    }

    const [projectProv, canvasProv] = await Promise.all([
      getFieldProvenance(project.id, "project"),
      getFieldProvenance(project.id, "leanCanvas"),
    ]);
    const provFor = { project: projectProv, leanCanvas: canvasProv } as Record<string, Record<string, ProvenanceInfo>>;

    const writes: PlannedWrite[] = [];
    const suggestions: PlannedWrite[] = [];
    for (const w of proposals) {
      if (w.entity !== "project" && w.entity !== "leanCanvas") continue;
      const isNewAndWritten = !dream.projectId && w.entity === "project" && current.project[w.field] !== undefined;
      if (isNewAndWritten) {
        writes.push(w); // written at creation above — just record its provenance
        continue;
      }
      if (!dream.projectId && w.entity === "project") continue; // ASSIST on a new project: only name/summary/description
      const placement = decideAiPlacement(mode, current[w.entity][w.field] as never, provFor[w.entity][w.field]);
      if (placement === "write") writes.push(w);
      // Suggestions are shown next to canvas fields; project-level fields
      // (category, tags, SDG) have their own AI helpers in Snabbstart.
      else if (w.entity === "leanCanvas") suggestions.push(w);
    }

    const aiUser = await getAiParticipantUser();
    // The summary was built with the conversation's open questions as input
    // and consolidates them (often rephrased), so merging both lists would
    // duplicate them; fall back to the conversation's own only if the
    // summary has none.
    const openQuestions = summary.openQuestions.length ? summary.openQuestions : parseOpenQuestions(dream.openQuestions);
    const canvasWrites = writes.filter((w) => w.entity === "leanCanvas");
    const projectFieldWrites = dream.projectId ? writes.filter((w) => w.entity === "project") : [];

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: {
          ...(dream.projectId ? {} : { aiMode: mode }),
          ...Object.fromEntries(
            projectFieldWrites.map((w) => [w.field, w.field === "description" ? descriptionHtml(w.value as string) : w.value]),
          ),
          // Conditions only fill what isn't known yet.
          ...(summary.conditions.weeklyHours != null && current.project.weeklyHours == null
            ? { weeklyHours: summary.conditions.weeklyHours }
            : {}),
          ...(summary.conditions.teamMode && current.project.teamMode == null ? { teamMode: summary.conditions.teamMode } : {}),
          ...(summary.conditions.ambition && current.project.ambition == null ? { ambition: summary.conditions.ambition } : {}),
        },
      });
      if (canvasWrites.length) {
        const data = Object.fromEntries(canvasWrites.map((w) => [w.field, w.value]));
        await tx.leanCanvas.upsert({
          where: { projectSlug: project.slug },
          create: { projectSlug: project.slug, updatedById: userId, ...data },
          update: { updatedById: userId, ...data },
        });
      }
      for (const w of writes) {
        await recordAiWrite(tx, { projectId: project.id, entity: w.entity, field: w.field, status: w.status });
      }
      for (const w of suggestions) {
        await createAiSuggestion(tx, { projectId: project.id, entity: w.entity, field: w.field, content: w.value as string });
      }
      // Open questions become things to think about: shown in Snabbstart
      // ("Att fundera på"), and as wishlist cards when the AI project
      // manager is on (it is by default).
      const pm = await tx.project.findUnique({ where: { id: project.id }, select: { aiProjectManager: true } });
      if (openQuestions.length && pm?.aiProjectManager) {
        await tx.kanbanCard.createMany({
          data: openQuestions.map((q, i) => ({
            projectSlug: project.slug,
            title: q.length > 120 ? `${q.slice(0, 117)}…` : q,
            description: "Öppen fråga från Drömsamtalet.",
            column: "BACKLOG",
            order: i,
            createdById: aiUser.id,
            createdByAi: true,
          })),
        });
      }
      await tx.dreamConversation.update({
        where: { id: dream.id },
        data: {
          projectId: project.id,
          openQuestions,
          summary: { ...summary, sections } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.room.update({ where: { id: roomId }, data: { convertedToProjectId: project.id } });
    });

    // The description step of Snabbstart is covered by the conversation.
    await markChecklistDone(project.id, "dream_defined", userId);
    redirect(`/projects/${project.slug}/guide`);
  } catch (err) {
    // redirect() works by throwing — let it through untouched.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
    await prisma.dreamConversation.updateMany({ where: { id: dream.id, status: "confirmed" }, data: { status: "summary_pending" } });
    throw err;
  }
}

function trimSections(s: DreamSummarySections): Partial<DreamSummarySections> {
  const out: Partial<DreamSummarySections> = {};
  for (const k of ["dream", "problem", "idea", "people", "conditions"] as const) {
    if (typeof s?.[k] === "string") out[k] = s[k].trim();
  }
  return out;
}

// Stored summaries were already coerced when generated; this only restores
// the type (and tolerates a hand-edited or older row).
function coerceDreamSummaryStored(raw: unknown): DreamSummary {
  return raw as DreamSummary;
}

// The project description is rich text (sanitized HTML); the summary is
// plain text with blank-line paragraphs.
function descriptionHtml(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
