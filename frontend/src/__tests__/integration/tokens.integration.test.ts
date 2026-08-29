// Real-Postgres coverage for src/lib/tokens.ts. These functions are pure
// transactional SQL (no business logic a mocked PrismaClient couldn't fake
// convincingly) — what a unit test can't catch is exactly what's tested here:
// that the TokenLedger/GtLedger 10% mirror actually round-trips through two
// real tables, that unique/foreign-key constraints are satisfied, and that
// reverseCardTokens's GtLedger-before-TokenLedger delete order is required by
// the real onDelete: SetNull/no-cascade relation (see tokens.ts's comment).
import { awardTokens, mintCardCompletion, reverseCardTokens } from "@/lib/tokens";
import { seedUser, seedUserAndProject, withRollback } from "./testDb";

describe("tokens.ts (integration)", () => {
  it("awardTokens mints a TokenLedger row and a 10% GtLedger mirror pointing back at it", async () => {
    await withRollback(async (tx) => {
      const { owner, project } = await seedUserAndProject(tx);

      const ledgerRow = await awardTokens(tx, {
        userId: owner.id,
        projectSlug: project.slug,
        tokens: 30,
        reason: "test award",
      });

      expect(ledgerRow.tokens).toBe(30);

      const mirror = await tx.gtLedger.findFirst({ where: { sourceTokenLedgerId: ledgerRow.id } });
      expect(mirror).not.toBeNull();
      expect(mirror!.tokens).toBeCloseTo(3);
      expect(mirror!.userId).toBe(owner.id);

      const gtBalance = await tx.gtLedger.aggregate({ where: { userId: owner.id }, _sum: { tokens: true } });
      expect(gtBalance._sum.tokens).toBeCloseTo(3);
    });
  });

  it("mintCardCompletion pays subtask completers plus the fixed creator/approver bonuses, all tied to the card", async () => {
    await withRollback(async (tx) => {
      const { owner: creator, project } = await seedUserAndProject(tx);
      const completer = await seedUser(tx, "completer");
      const approver = await seedUser(tx, "approver");

      const card = await tx.kanbanCard.create({
        data: {
          projectSlug: project.slug,
          title: "Test card",
          priority: "high",
          createdById: creator.id,
        },
      });

      const payees = await mintCardCompletion(tx, {
        card: { id: card.id, projectSlug: project.slug, title: card.title, priority: card.priority, createdById: creator.id },
        tokenValue: 30,
        subtasks: [{ completedById: completer.id }],
        assigneeId: null,
        approverId: approver.id,
      });

      expect(payees).toEqual([{ userId: completer.id, tokens: 30 }]);

      const cardLedgerRows = await tx.tokenLedger.findMany({ where: { kanbanCardId: card.id }, orderBy: { tokens: "desc" } });
      expect(cardLedgerRows).toHaveLength(3); // completer payout + creator bonus + approver bonus
      const byUser = Object.fromEntries(cardLedgerRows.map((r) => [r.userId, r.tokens]));
      expect(byUser[completer.id]).toBe(30);
      expect(byUser[creator.id]).toBe(5);
      expect(byUser[approver.id]).toBe(5);

      // Every TokenLedger row minted for this card should have produced a
      // matching GtLedger mirror — cross-checks the two ledgers never drift
      // apart, which is the entire reason awardTokens exists as a single
      // choke point (see its comment in tokens.ts).
      const mirrors = await tx.gtLedger.findMany({ where: { sourceTokenLedgerId: { in: cardLedgerRows.map((r) => r.id) } } });
      expect(mirrors).toHaveLength(3);
    });
  });

  it("reverseCardTokens deletes both ledgers for a card and returns the distinct affected user ids", async () => {
    await withRollback(async (tx) => {
      const { owner: creator, project } = await seedUserAndProject(tx);
      const completer = await seedUser(tx, "completer");
      const approver = await seedUser(tx, "approver");

      const card = await tx.kanbanCard.create({
        data: { projectSlug: project.slug, title: "Reversible card", priority: "normal", createdById: creator.id },
      });

      await mintCardCompletion(tx, {
        card: { id: card.id, projectSlug: project.slug, title: card.title, priority: card.priority, createdById: creator.id },
        tokenValue: 20,
        subtasks: [{ completedById: completer.id }],
        assigneeId: null,
        approverId: approver.id,
      });

      const affectedUsers = await reverseCardTokens(tx, card.id);
      expect(new Set(affectedUsers)).toEqual(new Set([completer.id, creator.id, approver.id]));

      const remainingTokenLedger = await tx.tokenLedger.findMany({ where: { kanbanCardId: card.id } });
      expect(remainingTokenLedger).toHaveLength(0);

      // GtLedger mirrors must be gone too, not just orphaned with a null
      // sourceTokenLedgerId — this is the specific bug reverseCardTokens's
      // comment warns about (onDelete: SetNull would otherwise leave a GT
      // balance standing for a completion that no longer exists).
      const remainingMirrorsForUsers = await tx.gtLedger.findMany({
        where: { userId: { in: [completer.id, creator.id, approver.id] } },
      });
      expect(remainingMirrorsForUsers).toHaveLength(0);
    });
  });

  it("reverseCardTokens on a card with no token history returns an empty array and touches nothing", async () => {
    await withRollback(async (tx) => {
      const { owner: creator, project } = await seedUserAndProject(tx);
      const card = await tx.kanbanCard.create({
        data: { projectSlug: project.slug, title: "Untouched card", priority: "low", createdById: creator.id },
      });

      const affectedUsers = await reverseCardTokens(tx, card.id);
      expect(affectedUsers).toEqual([]);
    });
  });
});
