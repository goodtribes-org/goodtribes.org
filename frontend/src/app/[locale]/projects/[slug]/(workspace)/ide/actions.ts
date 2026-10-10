"use server";

import { auth } from "@/auth";
import { wrapUntrusted } from "@/lib/untrusted";
import { prisma } from "@/lib/prisma";
import { cardPhaseAfterGate, countOpenPhaseTasks } from "@/lib/phaseWork";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isAiProjectStartAvailable } from "@/lib/aiProjectStart";
import { buildTranscript, runIdeaFill, type FillSection } from "@/lib/ideaFill";
import { InsightError, runCritique, runInterviewSynthesis } from "@/lib/ideaInsights";
import { aiGateMessage, resolveAiMode, type AiGateBlockReason } from "@/lib/aiMode";
import { startUppstartFill } from "@/lib/uppstartFill";
import { markChecklistDone } from "../../guide/actions";
import { logger } from "@/lib/logger";
import type { PhaseGateOutcome } from "@prisma/client";
import { getCanvasFieldLabels } from "@/lib/canvasFieldLabels";
import { snapshotImpactModel } from "@/lib/impactModelVersions";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { cardsForDecision, ideaGateCriteria, missingCriteria, runGateBrief, type GateBrief } from "@/lib/phaseGate";
import { latestInsight, type SynthesisContent } from "@/lib/ideaInsights";
import { LEAN_CANVAS_STORED_FIELDS } from "../lean-canvas/fields";
import { VALUE_PROPOSITION_FIELDS } from "../value-proposition/fields";
import { advanceProjectPhase } from "../edit/actions";
import { draftText, normalizeContentLocale } from "@/lib/aiLanguage";

const RETRYABLE: readonly FillSection[] = ["leanCanvas", "impactModel", "valueProposition", "marketScan", "interviewGuide", "critique"];

// "Försök igen" for a section the AI couldn't fill (failed, or cut short).
// Same background fill as after the conversation, for just that section.
export async function retryIdeaFillSection(projectSlug: string, section: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!RETRYABLE.includes(section as FillSection)) throw new Error("Okänd sektion");
  if (!(await isAiProjectStartAvailable(session.user.id))) throw new Error("AI är inte tillgänglig just nu");

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, slug: true, dreamConversation: { select: { id: true, roomId: true, aiMode: true } } },
  });
  if (!project?.dreamConversation) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");

  const dream = project.dreamConversation;
  await prisma.$executeRaw`
    UPDATE "DreamConversation"
    SET "fillStatus" = COALESCE("fillStatus", '{}'::jsonb) || jsonb_build_object(${section}::text, 'pending'::text),
        "updatedAt" = NOW()
    WHERE id = ${dream.id}`;
  const transcript = await buildTranscript(dream.roomId);
  void runIdeaFill({
    dreamId: dream.id,
    projectId: project.id,
    projectSlug: project.slug,
    mode: dream.aiMode,
    transcript,
    userId: session.user.id,
    only: [section as FillSection],
  });
  revalidatePath(`/projects/${projectSlug}/ide`);
}

async function requireLeadProject(projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isAiProjectStartAvailable(session.user.id))) throw new Error("AI är inte tillgänglig just nu");
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, slug: true } });
  if (!project) throw new Error("Projektet hittades inte");
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) throw new Error("Forbidden");
  return { project, userId: session.user.id };
}

function insightErrorMessage(err: unknown): string {
  const reason = err instanceof InsightError ? err.message : "";
  if (!(err instanceof InsightError) || reason === "empty") logger.error("idea-insight failed", { err: String(err) });
  if (reason === "budget_exceeded" || reason === "rate_limited" || reason === "mode" || reason === "not_configured") {
    return aiGateMessage(reason as AiGateBlockReason);
  }
  if (reason === "no_interviews") return "Logga minst en intervju först.";
  return "Kunde inte göra det just nu — försök igen.";
}

// "Granska igen": a fresh Kritikern review of the current drafts.
export async function rerunCritique(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    await runCritique(project.id, userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

// "Sammanfatta intervjuerna": learnings plus a verdict per assumption,
// grounded in the logged interviews. Three or more interviews tick the
// checklist item — that's the Idé phase's minimum.
export async function synthesizeInterviews(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    const synthesis = await runInterviewSynthesis(project.id, project.slug, userId);
    if (synthesis.interviewCount >= 3) await markChecklistDone(project.id, "target_audience_interviews", userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

// ─── Fasgrind Idé → Uppstart ────────────────────────────────────────────────

export async function generateGateBrief(projectSlug: string): Promise<{ error?: string }> {
  const { project, userId } = await requireLeadProject(projectSlug);
  try {
    await runGateBrief(project.id, project.slug, userId);
  } catch (err) {
    return { error: insightErrorMessage(err) };
  }
  revalidatePath(`/projects/${projectSlug}/ide`);
  return {};
}

const OUTCOMES: readonly PhaseGateOutcome[] = ["CONTINUE", "ADJUST", "PIVOT", "PAUSE"];

// The initiativtagare's decision at the gate. Always recorded — with any
// unmet criteria — then: CONTINUE moves the project to Uppstart (the same
// path as the manual "advance phase", after saving the canvases as a
// version) and on to the Uppstart overview; ADJUST / PIVOT stay in Idé and put what needs testing or
// reworking on the board; PAUSE marks the project as ownerless so others
// can take over (founder only, same rule as elsewhere). Doesn't need AI.
export async function decideIdeaGate(projectSlug: string, outcome: string, note: string): Promise<{ error?: string; next?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (!OUTCOMES.includes(outcome as PhaseGateOutcome)) return { error: "Okänt beslut" };
  const decision = outcome as PhaseGateOutcome;

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, slug: true, phase: true, leanCanvas: true, valueProposition: true, contentLocale: true },
  });
  if (!project) return { error: "Projektet hittades inte" };
  if (project.phase !== "IDEA" && project.phase !== "SPRINT") return { error: "Projektet är inte i Idéfasen längre" };
  const allowed = decision === "PAUSE"
    ? await hasProjectRole(project.id, userId, ["FOUNDER"])
    : await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES);
  if (!allowed) return { error: decision === "PAUSE" ? "Bara grundaren kan pausa projektet" : "Forbidden" };

  const { criteria } = await ideaGateCriteria(project.id, project.slug);
  const [synthesis, brief, fieldLabels, aiUser] = await Promise.all([
    latestInsight<SynthesisContent>(project.id, "INTERVIEW_SYNTHESIS"),
    latestInsight<GateBrief>(project.id, "PHASE_GATE"),
    getCanvasFieldLabels(normalizeContentLocale(project.contentLocale)),
    getAiParticipantUser(),
  ]);
  const labelFor = (key: string) => fieldLabels[key] ?? key;
  const cards = cardsForDecision(decision, synthesis?.content ?? null, brief?.content ?? null, labelFor, draftText(project.contentLocale));

  await prisma.$transaction(async (tx) => {
    const openTaskCount = await countOpenPhaseTasks(tx, project.slug, project.phase);
    await tx.phaseGateDecision.create({
      data: {
        projectId: project.id,
        fromPhase: project.phase,
        outcome: decision,
        note: note.trim() || null,
        missing: missingCriteria(criteria),
        openTaskCount,
        decidedById: userId,
      },
    });
    if (cards.length) {
      await tx.kanbanCard.createMany({
        data: cards.map((c, i) => ({
          projectSlug: project.slug,
          title: c.title,
          description: c.description,
          column: "TODO",
          order: i,
          createdById: aiUser.id,
          createdByAi: true,
          phase: cardPhaseAfterGate(project.phase, decision),
        })),
      });
    }
    if (decision === "CONTINUE") {
      // The canvases as they were when the phase was closed.
      if (project.leanCanvas) {
        const lc = project.leanCanvas as Record<string, unknown>;
        await tx.leanCanvasVersion.create({
          data: { projectSlug: project.slug, savedById: userId, ...Object.fromEntries(LEAN_CANVAS_STORED_FIELDS.map((f) => [f, lc[f] ?? null])) },
        });
      }
      if (project.valueProposition) {
        const vp = project.valueProposition as Record<string, unknown>;
        await tx.valuePropositionVersion.create({
          data: { projectSlug: project.slug, savedById: userId, ...Object.fromEntries(VALUE_PROPOSITION_FIELDS.map((f) => [f, vp[f] ?? null])) },
        });
      }
      await snapshotImpactModel(tx, project.slug, userId);
    }
    if (decision === "PAUSE") {
      await tx.project.update({ where: { id: project.id }, data: { abandonedAt: new Date() } });
    }
  });

  revalidatePath(`/projects/${projectSlug}`, "layout");
  if (decision !== "CONTINUE") return {};

  await advanceProjectPhase(project.slug);
  // On to the Uppstart overview. In AGENT mode the AI starts drafting it
  // right away; otherwise the page offers to (or the team does it by hand).
  if (!(await isAiProjectStartAvailable(userId))) return {};
  const { mode } = await resolveAiMode({ projectId: project.id, feature: "project-plan", phase: "PILOT" });
  if (mode === "AGENT") await startUppstartFill({ projectId: project.id, projectSlug: project.slug, userId });
  return { next: `/projects/${project.slug}/uppstart` };
}

// "+ Ny uppgift för steget" on the phase page: a card
// already tied to the Idé phase and the step it's for, so it lands in the
// step's list and counts at the gate. createCard does the membership check.
export async function createStepCard(projectSlug: string, stepKey: string, title: string) {
  const { createCard } = await import("../kanban/actions");
  const { CATEGORY_ORDER } = await import("@/lib/kanbanCategories");
  const text = title.trim();
  if (!text) return { error: "Skriv vad uppgiften är." };
  return createCard(projectSlug, text, "TODO", undefined, undefined, undefined, undefined, undefined, undefined, CATEGORY_ORDER[0], { phase: "IDEA", stepKey });
}

// "Låt AI:n välja": globala mål picked by the AI from the project's
// description and canvas, on the user's click. Replaces the selection and is
// marked as an AI draft (Antagande). No call when the SDG step is MANUAL.
export async function chooseSdgGoalsWithAi(
  projectSlug: string,
): Promise<{ goals: number[]; reasoning: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: {
      id: true, title: true, summary: true, description: true, sdgGoals: true,
      leanCanvas: { select: { purpose: true, impact: true, customerSegments: true, jobsToBeDone: true, solution: true } },
    },
  });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };

  const { mode } = await resolveAiMode({ projectId: project.id, feature: "sdg-suggestion", stepKey: "ai_reviewed" });
  if (mode === "MANUAL") return { error: aiGateMessage("mode") };

  const c = project.leanCanvas;
  const text = [
    project.title,
    project.summary,
    (project.description ?? "").replace(/<[^>]+>/g, " "),
    c?.purpose && `Syfte: ${c.purpose}`,
    c?.impact && `Impact: ${c.impact}`,
    c?.customerSegments && `Kundsegment: ${c.customerSegments}`,
    c?.jobsToBeDone && `Jobs to be done: ${c.jobsToBeDone}`,
    c?.solution && `Lösning: ${c.solution}`,
  ].filter(Boolean).join("\n");

  const { suggestSdgGoals } = await import("@/lib/claude");
  const res = await suggestSdgGoals(text, session.user.id, project.id);
  if (!res || res.goals.length === 0) return { error: "AI:n kunde inte föreslå några mål just nu. Försök igen eller välj själv." };
  const goals = res.goals.slice(0, 3);

  const { recordAiWrite } = await import("@/lib/fieldProvenance");
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { sdgGoals: goals } });
    await recordAiWrite(tx, { projectId: project.id, entity: "project", field: "sdgGoals", status: "ANTAR" });
  });
  await markChecklistDone(project.id, "ai_reviewed", session.user.id);
  const { creditAiForStep } = await import("@/lib/ideaStepCards");
  await creditAiForStep(projectSlug, "ai_reviewed");
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { goals, reasoning: res.reasoning };
}

// The project's cover image, uploaded straight from "Om projektet".
export async function updateProjectImage(projectSlug: string, imageUrl: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const url = imageUrl.trim();
  if (!url) return { error: "Ingen bild" };
  await prisma.project.update({ where: { id: project.id }, data: { imageUrl: url } });
  const { PROJECTS_LIST_TAG, invalidateListCache } = await import("@/lib/listCache");
  invalidateListCache(PROJECTS_LIST_TAG);
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { ok: true };
}

// "Låt AI:n skriva ett förslag" on "Om projektet": a summary and description
// drafted from what exists at this, the first step — the Drömsamtal (if the
// project started with one) and the team's own title and text. Not the
// canvas: it comes later in the phase. Only returned — nothing is written until the user picks "Använd
// förslaget" (applyAboutDraft).
const ABOUT_DRAFT_TOOL = {
  name: "projektpresentation",
  description: "Förslag på sammanfattning och beskrivning av projektet.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: { type: "string", description: "En mening, 60–150 tecken: vad projektet gör och för vem." },
      paragraphs: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 4,
        description: "3–4 korta stycken, totalt 120–250 ord: problemet, idén, vilken skillnad det gör, och vilka ni söker (volontärer, partners, sponsorer).",
      },
    },
    required: ["summary", "paragraphs"],
  },
};

const ABOUT_DRAFT_PROMPT = `Du skriver presentationstexten för ett socialt projekt på GoodTribes.org. Texten är det första volontärer, partners och sponsorer läser, så den ska göra dem nyfikna och vilja engagera sig.

Regler:
- Använd bara det som står i underlaget. Hitta inte på siffror, namn, platser, resultat eller samarbeten.
- Saknas något, skriv allmänt i stället för att gissa.
- Varmt, konkret och enkelt språk, inga modeord. Skriv "vi".
- Sammanfattning: en mening, 60–150 tecken.
- Beskrivning: 3–4 korta stycken, totalt 120–250 ord. Problemet, idén, skillnaden det gör, och sist vilka ni söker.
- Underlaget är det initiativtagaren berättat hittills (egen text och ev. Drömsamtalet). Bygg vidare på deras ord och idé.

Svara genom verktyget "projektpresentation".`;

export async function draftAboutText(
  projectSlug: string,
): Promise<{ summary: string; descriptionHtml: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, title: true, summary: true, description: true, dreamConversation: { select: { roomId: true } } },
  });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };

  const { getAiClientFor } = await import("@/lib/aiMode");
  const gate = await getAiClientFor({
    feature: "dream-conversation",
    kind: "assist",
    userId: session.user.id,
    projectId: project.id,
    stepKey: "dream_defined",
    language: "project",
  });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };

  const transcript = project.dreamConversation ? await buildTranscript(project.dreamConversation.roomId) : "";
  const context = [
    `Projektnamn: ${project.title}`,
    project.summary && `Nuvarande sammanfattning: ${project.summary}`,
    project.description && `Nuvarande beskrivning: ${project.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`,
    transcript && `Drömsamtalet:\n${transcript}`,
  ].filter(Boolean).join("\n");
  if (!project.summary?.trim() && !project.description?.trim() && !transcript) {
    return { error: "Skriv några rader om er idé först, så har AI:n något att utgå från." };
  }

  try {
    const res = await gate.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: ABOUT_DRAFT_PROMPT,
      tools: [ABOUT_DRAFT_TOOL],
      tool_choice: { type: "tool", name: ABOUT_DRAFT_TOOL.name },
      messages: [{ role: "user", content: wrapUntrusted("projektets material", context) }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    const input = (block && "input" in block ? block.input : {}) as { summary?: unknown; paragraphs?: unknown };
    const summary = typeof input.summary === "string" ? input.summary.trim() : "";
    const paragraphs = Array.isArray(input.paragraphs) ? input.paragraphs.filter((p): p is string => typeof p === "string" && !!p.trim()) : [];
    if (!summary || paragraphs.length === 0) return { error: "AI:n kunde inte skriva ett förslag just nu. Försök igen." };
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return { summary, descriptionHtml: paragraphs.map((p) => `<p>${esc(p.trim())}</p>`).join("") };
  } catch (e) {
    logger.error("about draft failed", { projectSlug, error: e instanceof Error ? e.message : String(e) });
    return { error: "AI:n kunde inte skriva ett förslag just nu. Försök igen." };
  }
}

// "Använd förslaget": writes the AI's summary and description, marked as an
// AI draft (Antagande) like every other AI-written field.
export async function applyAboutDraft(projectSlug: string, summary: string, descriptionHtml: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const { sanitizeHtml } = await import("@/lib/sanitizeHtml");
  const { recordAiWrite } = await import("@/lib/fieldProvenance");
  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { summary: summary.trim(), description: sanitizeHtml(descriptionHtml) } });
    await recordAiWrite(tx, { projectId: project.id, entity: "project", field: "summary", status: "ANTAR" });
    await recordAiWrite(tx, { projectId: project.id, entity: "project", field: "description", status: "ANTAR" });
  });
  const { creditAiForStep } = await import("@/lib/ideaStepCards");
  await creditAiForStep(projectSlug, "dream_defined");
  const { PROJECTS_LIST_TAG, invalidateListCache } = await import("@/lib/listCache");
  invalidateListCache(PROJECTS_LIST_TAG);
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { ok: true };
}

// "Låt AI:n föreslå intervjufrågor": a guide drafted from the assumptions
// (lib/ideaFill draftInterviewGuide). Only returned; "Använd som vår
// intervjuguide" (applyInterviewGuide) saves it in the wiki.
export async function draftInterviewGuideAction(projectSlug: string): Promise<{ html: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const { getAiClientFor } = await import("@/lib/aiMode");
  const gate = await getAiClientFor({
    feature: "dream-conversation",
    kind: "assist",
    userId: session.user.id,
    projectId: project.id,
    stepKey: "target_audience_interviews",
    language: "project",
  });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };
  try {
    const { draftInterviewGuide } = await import("@/lib/ideaFill");
    const html = await draftInterviewGuide(gate.client, { projectId: project.id, projectSlug });
    if (!html) return { error: "AI:n kunde inte föreslå frågor just nu. Försök igen." };
    return { html };
  } catch (e) {
    logger.error("interview guide draft failed", { projectSlug, error: e instanceof Error ? e.message : String(e) });
    return { error: "AI:n kunde inte föreslå frågor just nu. Försök igen." };
  }
}

export async function applyInterviewGuide(projectSlug: string, html: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true, contentLocale: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const { sanitizeHtml } = await import("@/lib/sanitizeHtml");
  const content = sanitizeHtml(html);
  const existing = await prisma.wikiPage.findUnique({
    where: { projectSlug_slug: { projectSlug, slug: "intervjuguide" } },
    select: { id: true, title: true, content: true, order: true },
  });
  if (existing) {
    // The wiki keeps no history, so the old guide is saved as its own page
    // before it's replaced — nothing the team wrote is lost.
    const day = new Date().toISOString().slice(0, 10);
    await prisma.$transaction([
      prisma.wikiPage.create({
        data: {
          projectSlug,
          slug: `intervjuguide-${Date.now()}`,
          title: `${existing.title} (${day})`,
          content: existing.content,
          order: existing.order + 1,
          createdById: session.user.id,
        },
      }),
      prisma.wikiPage.update({ where: { id: existing.id }, data: { content, updatedById: session.user.id } }),
    ]);
  } else {
    const aiUser = await getAiParticipantUser();
    const maxOrder = await prisma.wikiPage.aggregate({ where: { projectSlug }, _max: { order: true } });
    await prisma.wikiPage.create({
      data: {
        projectSlug,
        slug: "intervjuguide",
        title: draftText(project.contentLocale).titleInterviewGuide,
        content,
        order: (maxOrder._max.order ?? -1) + 1,
        createdById: aiUser.id,
      },
    });
  }
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { ok: true };
}

// "Klart med steget": marks an Idé step done in the checklist — which is what
// the header's phase bar, the step's status, the phase gate and the guide all
// read — and, if asked, moves the step's open cards to Done on the board.
// Cards move through moveKanbanCard, the board's own path: same membership,
// subtask and token rules as dragging them there. "Ångra" only un-marks the
// step; cards stay where they are.
export async function setStepDone(
  projectSlug: string,
  stepKey: string,
  done: boolean,
  moveCards: boolean,
): Promise<{ ok: true; moved: number; notMoved: string[] } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const { INITIATIVE_CHECKLIST_ITEMS } = await import("@/lib/projectPhase");
  if (!INITIATIVE_CHECKLIST_ITEMS.IDEA.some((i) => i.key === stepKey)) return { error: "Okänt steg" };

  if (!done) {
    await prisma.initiativeChecklistItem.deleteMany({ where: { projectId: project.id, itemKey: stepKey } });
    revalidatePath(`/projects/${projectSlug}`, "layout");
    return { ok: true, moved: 0, notMoved: [] };
  }

  await markChecklistDone(project.id, stepKey, session.user.id);
  let moved = 0;
  const notMoved: string[] = [];
  if (moveCards) {
    const { moveKanbanCard } = await import("@/lib/kanbanMove");
    const open = await prisma.kanbanCard.findMany({
      where: { projectSlug, phase: { in: ["IDEA", "SPRINT"] }, stepKey, column: { not: "DONE" } },
      select: { id: true, title: true },
    });
    for (const card of open) {
      const res = await moveKanbanCard(card.id, "DONE", session.user.id);
      if (res && "error" in res && res.error) notMoved.push(card.title);
      else moved++;
    }
  }
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { ok: true, moved, notMoved };
}

// "Startar du projektet tillsammans med någon?" (#201): "Inte nu", or "Bjud in"
// on the way to the members page — either way the question has been
// answered, on every device.
export async function answerInviteQuestion(projectSlug: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  await prisma.project.update({ where: { id: project.id }, data: { inviteQuestionDismissedAt: new Date() } });
  revalidatePath(`/projects/${projectSlug}`, "layout");
  return { ok: true };
}
