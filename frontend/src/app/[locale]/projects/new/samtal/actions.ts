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
import { getAiClientFor, aiGateMessage, resolveAiMode } from "@/lib/aiMode";
import { createProjectRecord } from "@/lib/createProject";
import { getFieldProvenance, recordAiWrite } from "@/lib/fieldProvenance";
import { decideAiPlacement } from "@/lib/aiSuggestions";
import { buildTranscript, generateBasics, runIdeaFill, statusFor } from "@/lib/ideaFill";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
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
// into suggestions (see createProjectFromDream). One conversation per project;
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

// ─── Creating the project and filling in the Idé phase ─────────────────────

// When the conversation is done: one quick AI call for the project's basics
// (name, description, SDG, conditions), then the project exists and the
// user moves on at once while the rest of phase 1 (canvases, market scan,
// interview guide) fills in in the background — see runIdeaFill. There is
// no separate summary to approve: in AGENT mode the result page *is* the
// review, every field marked as an AI draft with vet/antar and an Edit
// button. Nothing a human wrote is ever overwritten (a conversation started
// from an existing project only fills empty fields; the rest become
// suggestions).
export async function createProjectFromDream(roomId: string) {
  const userId = await requireUser();
  if (!(await isAiProjectStartAvailable(userId))) redirect("/projects/new?manual=1");
  const dream = await requireOwnDream(roomId, userId);

  // Claim the conversation first so a double click can't create two projects.
  const claimed = await prisma.dreamConversation.updateMany({
    where: { id: dream.id, status: { in: ["in_progress", "summary_pending"] } },
    data: { status: "confirmed" },
  });
  if (claimed.count !== 1) {
    // Already created (e.g. a second click, or back-button): go to it.
    const done = dream.projectId ? await prisma.project.findUnique({ where: { id: dream.projectId }, select: { slug: true } }) : null;
    if (done) redirect(dream.aiMode === "AGENT" ? `/projects/${done.slug}/ide` : `/projects/${done.slug}/guide`);
    throw new Error("Projektet håller redan på att skapas");
  }

  // Not one transaction end to end: createProjectRecord is shared and not
  // transaction-aware (same trade-off as approveAiProjectPlan), so a failure
  // after it leaves a bare project; the claim is released so the user can
  // retry.
  try {
    const gate = await getAiClientFor({ feature: "dream-conversation", kind: "assist", userId, projectId: null });
    if (!gate.ok) throw new Error(aiGateMessage(gate.reason));
    const transcript = await buildTranscript(roomId);
    const basics = await generateBasics(gate.client, transcript);
    if (!basics.title.value) throw new Error("Kunde inte sammanfatta samtalet — försök igen.");

    const mode = dream.aiMode;
    const agent = mode === "AGENT";
    // name/summary/description always (a project needs them); category,
    // tags and SDG only when the AI does the work.
    const proposals: { field: "title" | "summary" | "description" | "category" | "tags" | "sdgGoals"; value: string | string[] | number[]; basis: "user" | "inferred" }[] = [
      { field: "title", value: basics.title.value, basis: basics.title.basis },
      ...(basics.summary.value ? [{ field: "summary" as const, value: basics.summary.value, basis: basics.summary.basis }] : []),
      ...(basics.description.value ? [{ field: "description" as const, value: basics.description.value, basis: basics.description.basis }] : []),
      ...(agent && basics.category ? [{ field: "category" as const, value: basics.category, basis: "inferred" as const }] : []),
      ...(agent && basics.tags.length ? [{ field: "tags" as const, value: basics.tags, basis: "inferred" as const }] : []),
      ...(agent && basics.sdgGoals.length ? [{ field: "sdgGoals" as const, value: basics.sdgGoals, basis: "inferred" as const }] : []),
    ];

    let project: { id: string; slug: string };
    let writes = proposals;
    let current: { weeklyHours: number | null; teamMode: string | null; ambition: string | null } = { weeklyHours: null, teamMode: null, ambition: null };

    if (dream.projectId) {
      const existing = await prisma.project.findUnique({
        where: { id: dream.projectId },
        select: { id: true, slug: true, title: true, summary: true, description: true, category: true, tags: true, sdgGoals: true, weeklyHours: true, teamMode: true, ambition: true },
      });
      if (!existing) throw new Error("Projektet hittades inte");
      if (!(await hasProjectRole(existing.id, userId, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
      const provenance = await getFieldProvenance(existing.id, "project");
      writes = proposals.filter(
        (w) => decideAiPlacement(mode, (existing as Record<string, unknown>)[w.field] as string | null, provenance[w.field]) === "write",
      );
      project = existing;
      current = existing;
    } else {
      const value = (f: string) => proposals.find((w) => w.field === f)?.value;
      project = await createProjectRecord({
        title: value("title") as string,
        ownerId: userId,
        summary: (value("summary") as string | undefined) ?? null,
        description: descriptionHtml((value("description") as string | undefined) ?? ""),
        category: (value("category") as string | undefined) ?? null,
        tags: (value("tags") as string[] | undefined) ?? [],
        sdgGoals: (value("sdgGoals") as number[] | undefined) ?? [],
      });
    }

    const aiUser = await getAiParticipantUser();
    const openQuestions = basics.openQuestions.length ? basics.openQuestions : parseOpenQuestions(dream.openQuestions);
    const initialFill = {
      about: "done",
      leanCanvas: "pending",
      valueProposition: "pending",
      marketScan: agent ? "pending" : "skipped",
      interviewGuide: agent ? "pending" : "skipped",
    };

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: {
          ...(dream.projectId ? {} : { aiMode: mode }),
          ...(dream.projectId
            ? Object.fromEntries(writes.map((w) => [w.field, w.field === "description" ? descriptionHtml(w.value as string) : w.value]))
            : {}),
          // Conditions only fill what isn't known yet.
          ...(basics.conditions.weeklyHours != null && current.weeklyHours == null ? { weeklyHours: basics.conditions.weeklyHours } : {}),
          ...(basics.conditions.teamMode && current.teamMode == null ? { teamMode: basics.conditions.teamMode } : {}),
          ...(basics.conditions.ambition && current.ambition == null ? { ambition: basics.conditions.ambition } : {}),
        },
      });
      for (const w of writes) {
        await recordAiWrite(tx, { projectId: project.id, entity: "project", field: w.field, status: statusFor(w.basis) });
      }
      // Open questions: shown on the overview ("Att fundera på"), and as
      // wishlist cards when the AI project manager is on (default).
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
        data: { projectId: project.id, openQuestions, fillStatus: initialFill },
      });
      await tx.room.update({ where: { id: roomId }, data: { convertedToProjectId: project.id } });
    });

    await markChecklistDone(project.id, "dream_defined", userId);
    if (writes.some((w) => w.field === "sdgGoals")) await markChecklistDone(project.id, "ai_reviewed", userId);

    // The rest of phase 1 fills in while the user already looks at it.
    void runIdeaFill({ dreamId: dream.id, projectId: project.id, projectSlug: project.slug, mode, transcript, userId });

    redirect(agent ? `/projects/${project.slug}/ide` : `/projects/${project.slug}/guide`);
  } catch (err) {
    // redirect() works by throwing — let it through untouched.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
    await prisma.dreamConversation.updateMany({ where: { id: dream.id, status: "confirmed" }, data: { status: "in_progress" } });
    throw err;
  }
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
