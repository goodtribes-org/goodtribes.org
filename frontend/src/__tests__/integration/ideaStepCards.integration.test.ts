// Real-Postgres coverage for #200 (lib/ideaStepCards.ts): a new project gets
// a card per Idé step, created by GoodTribes; approving a step's cards pays
// out through the board's own path (moveKanbanCard → mintCardCompletion) and
// ticks the step once its last card is in Done. Both cases from the issue:
// a step a person did, and a step the AI did (GoodTribes gets the work
// share, the approving founder the approver bonus, nothing before approval).

import { prisma } from "@/lib/prisma";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("../../lib/meili", () => ({ indexDocuments: jest.fn(), deleteDocument: jest.fn() }));
jest.mock("../../lib/redis", () => ({ publishToKanban: jest.fn(), publishToUser: jest.fn(), publishToRoom: jest.fn() }));

import { createProjectRecord } from "@/lib/createProject";
import { creditAiForStep, IDEA_STEP_CARDS } from "@/lib/ideaStepCards";
import { moveKanbanCard } from "@/lib/kanbanMove";
import { getAiParticipantUser } from "@/lib/aiParticipant";

const s = `${process.pid}-stepcards`;

async function ledger(cardId: string) {
  const rows = await prisma.tokenLedger.findMany({ where: { kanbanCardId: cardId }, select: { id: true, userId: true, tokens: true } });
  const byUser: Record<string, number> = {};
  for (const r of rows) byUser[r.userId] = (byUser[r.userId] ?? 0) + r.tokens;
  const gt = await prisma.gtLedger.count({ where: { sourceTokenLedgerId: { in: rows.map((r) => r.id) } } });
  return { rows: rows.length, byUser, gt };
}

describe("Idé step cards (#200)", () => {
  let founderId = "";
  let memberId = "";
  let slug = "";
  let projectId = "";

  beforeAll(async () => {
    const founder = await prisma.user.create({ data: { email: `founder-${s}@test.goodtribes.org`, name: "Founder" } });
    const member = await prisma.user.create({ data: { email: `member-${s}@test.goodtribes.org`, name: "Member" } });
    founderId = founder.id;
    memberId = member.id;
    const project = await createProjectRecord({ title: `Stegkort ${s}`, ownerId: founder.id, contentLocale: "sv", dreamFounderId: founder.id });
    slug = project.slug;
    projectId = project.id;
    await prisma.projectMember.create({ data: { projectId, userId: memberId, role: "MEMBER" } });
  });

  afterAll(async () => {
    const cards = await prisma.kanbanCard.findMany({ where: { projectSlug: slug }, select: { id: true } });
    const ids = cards.map((c) => c.id);
    const tl = await prisma.tokenLedger.findMany({ where: { kanbanCardId: { in: ids } }, select: { id: true } });
    const txIds = (await prisma.ledgerJournalEntry.findMany({ where: { OR: [{ tokenLedgerId: { in: tl.map((t) => t.id) } }, { projectSlug: slug }] }, select: { transactionId: true } })).map((e) => e.transactionId);
    await prisma.ledgerJournalEntry.deleteMany({ where: { transactionId: { in: txIds } } });
    await prisma.gtLedger.deleteMany({ where: { sourceTokenLedgerId: { in: tl.map((t) => t.id) } } });
    await prisma.tokenLedger.deleteMany({ where: { kanbanCardId: { in: ids } } });
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [founderId, memberId] } } });
  });

  it("creates a card per Idé step, by GoodTribes, tagged with phase and step", async () => {
    const ai = await getAiParticipantUser();
    const cards = await prisma.kanbanCard.findMany({ where: { projectSlug: slug }, orderBy: { order: "asc" } });
    expect(cards).toHaveLength(IDEA_STEP_CARDS.length);
    expect(cards.every((c) => c.phase === "IDEA" && c.createdById === ai.id && c.createdByAi)).toBe(true);
    expect(cards.filter((c) => c.stepKey === "target_audience_interviews")).toHaveLength(3);
    // The Drömsamtal card: founder told it, GoodTribes wrote it up, waiting for approval.
    const dream = cards.find((c) => c.stepKey === "dream_defined")!;
    expect(dream.column).toBe("REVIEW");
    const subs = await prisma.kanbanCardSubtask.findMany({ where: { cardId: dream.id }, orderBy: { order: "asc" } });
    expect(subs.map((x) => x.completedById)).toEqual([founderId, ai.id]);
  });

  it("a step a person did: the person, GoodTribes (creator) and the approver are paid, and the step is ticked", async () => {
    const ai = await getAiParticipantUser();
    const card = await prisma.kanbanCard.findFirstOrThrow({ where: { projectSlug: slug, stepKey: "market_scan_partners" } });
    await prisma.kanbanCard.update({ where: { id: card.id }, data: { assigneeId: memberId } });

    const res = await moveKanbanCard(card.id, "DONE", founderId);
    expect(res).toMatchObject({ ok: true });

    const l = await ledger(card.id);
    expect(l.byUser[memberId]).toBe(20); // normal priority
    expect(l.byUser[ai.id]).toBe(5); // creator bonus
    expect(l.byUser[founderId]).toBe(5); // approver bonus
    expect(l.gt).toBe(l.rows); // every award mirrored in GT
    const done = await prisma.initiativeChecklistItem.findUnique({ where: { projectId_itemKey: { projectId, itemKey: "market_scan_partners" } } });
    expect(done?.completedAt).toBeTruthy();
  });

  it("a step the AI did: nothing is paid before approval, then GoodTribes gets the work share", async () => {
    const ai = await getAiParticipantUser();
    expect(await creditAiForStep(slug, "lean_canvas_created")).toBe(1);
    const card = await prisma.kanbanCard.findFirstOrThrow({ where: { projectSlug: slug, stepKey: "lean_canvas_created" } });
    expect(card).toMatchObject({ assigneeId: ai.id, column: "REVIEW" });
    expect((await ledger(card.id)).rows).toBe(0);

    await moveKanbanCard(card.id, "DONE", founderId);
    const l = await ledger(card.id);
    expect(l.byUser[ai.id]).toBe(20 + 5); // work share + creator bonus
    expect(l.byUser[founderId]).toBe(5);
  });

  it("the Drömsamtal card splits its value between founder and GoodTribes", async () => {
    const ai = await getAiParticipantUser();
    const card = await prisma.kanbanCard.findFirstOrThrow({ where: { projectSlug: slug, stepKey: "dream_defined" } });
    await moveKanbanCard(card.id, "DONE", founderId);
    const l = await ledger(card.id);
    expect(l.byUser[founderId]).toBe(10 + 5); // half the work + approver
    expect(l.byUser[ai.id]).toBe(10 + 5); // half the work + creator
  });

  it("interviews: the step is ticked only when its last card is done", async () => {
    const cards = await prisma.kanbanCard.findMany({ where: { projectSlug: slug, stepKey: "target_audience_interviews" }, orderBy: { order: "asc" } });
    const ticked = () => prisma.initiativeChecklistItem.findUnique({ where: { projectId_itemKey: { projectId, itemKey: "target_audience_interviews" } } });
    for (const c of cards.slice(0, 2)) {
      await prisma.kanbanCard.update({ where: { id: c.id }, data: { assigneeId: founderId } });
      await moveKanbanCard(c.id, "DONE", founderId);
    }
    expect(await ticked()).toBeNull();
    await prisma.kanbanCard.update({ where: { id: cards[2].id }, data: { assigneeId: founderId } });
    await moveKanbanCard(cards[2].id, "DONE", founderId);
    expect((await ticked())?.completedAt).toBeTruthy();
  });

  it("the double-entry journal for the project's payouts sums to zero, also after a reversal", async () => {
    const card = await prisma.kanbanCard.findFirstOrThrow({ where: { projectSlug: slug, stepKey: "market_scan_partners" } });
    await moveKanbanCard(card.id, "TODO", founderId);
    expect((await ledger(card.id)).rows).toBe(0);
    const txIds = (await prisma.ledgerJournalEntry.findMany({ where: { projectSlug: slug }, select: { transactionId: true } })).map((e) => e.transactionId);
    expect(txIds.length).toBeGreaterThan(0);
    const sum = await prisma.ledgerJournalEntry.aggregate({ where: { transactionId: { in: txIds } }, _sum: { amount: true } });
    expect(sum._sum.amount ?? 0).toBeCloseTo(0);
  });
});
