import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { CATEGORY_ORDER } from "@/lib/kanbanCategories";
import { normalizeContentLocale } from "@/lib/aiLanguage";

// The Idé phase's work on the board (#200): every new project gets a card per
// Idé step (interviews split in three, since no card should take more than a
// day). The cards carry phase IDEA + stepKey, so the phase page lists them per
// step and the gate counts them. They're created by GoodTribes — the AI
// participant user — so the creator bonus goes there.
//
// Payout is the board's, never a second path: a lead moving a card to Done
// (on the board, or with "Klar" on the phase page) pays through
// moveKanbanCard → mintCardCompletion. When the AI did a step's work,
// creditAiForStep makes GoodTribes the assignee and parks the card in Review,
// so the work share goes to GoodTribes — but only once a lead approves it.

type StepCardSpec = { stepKey: string; title: { sv: string; en: string } };

export const IDEA_STEP_CARDS: StepCardSpec[] = [
  { stepKey: "dream_defined", title: { sv: "Beskriv projektet", en: "Describe the project" } },
  { stepKey: "lean_canvas_created", title: { sv: "Fyll i Social Lean Canvas", en: "Fill in the Social Lean Canvas" } },
  { stepKey: "value_proposition_created", title: { sv: "Fyll i värdeerbjudandet", en: "Fill in the value proposition" } },
  { stepKey: "impact_model_created", title: { sv: "Bygg impactmodellen", en: "Build the impact model" } },
  { stepKey: "ai_reviewed", title: { sv: "Välj globala mål", en: "Choose global goals" } },
  { stepKey: "target_audience_interviews", title: { sv: "Boka 3–5 målgruppsintervjuer", en: "Book 3–5 target-audience interviews" } },
  { stepKey: "target_audience_interviews", title: { sv: "Genomför intervju 1–2", en: "Do interviews 1–2" } },
  { stepKey: "target_audience_interviews", title: { sv: "Genomför intervju 3–5", en: "Do interviews 3–5" } },
  { stepKey: "market_scan_partners", title: { sv: "Gör en första omvärldsbevakning", en: "Do a first market scan" } },
];

// The Drömsamtal card's two parts: the founder told the dream, GoodTribes
// wrote it up. Both are done by the time the project exists; the card's
// value is split between them when the founder approves it.
const DREAM_SUBTASKS = { told: { sv: "Berätta om drömmen", en: "Tell the dream" }, wrote: { sv: "Sammanfatta och skriv projektbeskrivningen", en: "Summarise it and write the project description" } };

export async function createIdeaStepCards(
  db: Prisma.TransactionClient | typeof prisma,
  params: { projectSlug: string; contentLocale?: string | null; dreamFounderId?: string },
): Promise<void> {
  const ai = await getAiParticipantUser();
  const lang = normalizeContentLocale(params.contentLocale) === "en" ? "en" : "sv";
  for (const [i, spec] of IDEA_STEP_CARDS.entries()) {
    const card = await db.kanbanCard.create({
      data: {
        projectSlug: params.projectSlug,
        title: spec.title[lang],
        column: "TODO",
        order: i,
        priority: "normal",
        category: CATEGORY_ORDER[0],
        phase: "IDEA",
        stepKey: spec.stepKey,
        createdById: ai.id,
        createdByAi: true,
      },
    });
    if (spec.stepKey === "dream_defined" && params.dreamFounderId) {
      await db.kanbanCardSubtask.createMany({
        data: [
          { cardId: card.id, title: DREAM_SUBTASKS.told[lang], order: 0, done: true, completedById: params.dreamFounderId },
          { cardId: card.id, title: DREAM_SUBTASKS.wrote[lang], order: 1, done: true, completedById: ai.id },
        ],
      });
      await db.kanbanCard.update({ where: { id: card.id }, data: { column: "REVIEW" } });
    }
  }
}

// The AI did this step's work (an Idé fill section, or an AI button the team
// used): GoodTribes becomes the assignee of the step's open, unclaimed cards
// and they wait in Review for a lead's approval. Cards someone already took,
// or with subtasks (whose completers are the payees), are left alone.
export async function creditAiForStep(projectSlug: string, stepKey: string): Promise<number> {
  const ai = await getAiParticipantUser();
  const res = await prisma.kanbanCard.updateMany({
    where: {
      projectSlug,
      phase: "IDEA",
      stepKey,
      assigneeId: null,
      column: { in: ["BACKLOG", "TODO", "DOING"] },
      subtasks: { none: {} },
    },
    data: { assigneeId: ai.id, column: "REVIEW" },
  });
  return res.count;
}

// When the last card of a step lands in Done, the step is done (kanbanMove).
export async function markStepDoneIfCardsDone(
  projectId: string,
  card: { projectSlug: string; phase: string | null; stepKey: string | null },
  userId: string,
): Promise<boolean> {
  if (!card.stepKey || (card.phase !== "IDEA" && card.phase !== "SPRINT")) return false;
  const open = await prisma.kanbanCard.count({
    where: { projectSlug: card.projectSlug, phase: { in: ["IDEA", "SPRINT"] }, stepKey: card.stepKey, column: { not: "DONE" } },
  });
  if (open > 0) return false;
  await prisma.initiativeChecklistItem.upsert({
    where: { projectId_itemKey: { projectId, itemKey: card.stepKey } },
    create: { projectId, phase: "IDEA", itemKey: card.stepKey, completedAt: new Date(), completedById: userId },
    update: { completedAt: new Date(), completedById: userId },
  });
  return true;
}
