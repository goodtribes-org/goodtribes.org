// Real-Postgres coverage for lib/phaseWork.ts: kanban cards tied to the
// phase they're work for, counted at the gate. What a mocked Prisma couldn't
// show: the groupBy/count filters really split done/open/wishlist/untagged
// and skip GitHub mirrors, a gate decision records the open count, and a new
// card from the board lands in the project's current phase.

import { prisma } from "@/lib/prisma";

const mockAuth = jest.fn();
jest.mock("../../auth", () => ({ auth: () => mockAuth() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "sv",
}));
jest.mock("../../lib/meili", () => ({ indexDocuments: jest.fn(), deleteDocument: jest.fn() }));

import { getPhaseWork } from "@/lib/phaseWork";
import { decideIdeaGate } from "@/app/[locale]/projects/[slug]/(workspace)/ide/actions";
import { createCard, updateCard } from "@/app/[locale]/projects/[slug]/(workspace)/kanban/actions";
import { CATEGORY_ORDER } from "@/lib/kanbanCategories";

const s = `${process.pid}-phasework`;

describe("the work behind a phase", () => {
  it("counts a phase's cards at the gate and carries open ones forward", async () => {
    const founder = await prisma.user.create({ data: { email: `founder-${s}@test.goodtribes.org`, name: "Founder" } });
    const project = await prisma.project.create({ data: { slug: `work-${s}`, title: "Work", ownerId: founder.id, phase: "IDEA" } });
    await prisma.projectMember.create({ data: { projectId: project.id, userId: founder.id, role: "FOUNDER" } });
    const slug = project.slug;
    const card = (title: string, column: string, extra: object = {}) => ({ projectSlug: slug, title, column, createdById: founder.id, ...extra });

    try {
      await prisma.kanbanCard.createMany({
        data: [
          card("Klar", "DONE", { phase: "IDEA", stepKey: "lean_canvas_created" }),
          card("Pågår", "DOING", { phase: "IDEA", stepKey: "target_audience_interviews" }),
          card("Önskan", "BACKLOG", { phase: "IDEA" }),
          card("Gammal", "TODO"),
          card("Från GitHub", "TODO", { phase: "IDEA", source: "github", githubItemId: `item-${s}` }),
          card("Senare", "TODO", { phase: "PILOT" }),
        ],
      });

      const idea = await getPhaseWork(slug, "IDEA");
      expect(idea).toMatchObject({ done: 1, open: 1, wishlist: 1, earlierOpen: 0, untagged: 1 });
      expect(idea.openCards).toEqual([expect.objectContaining({ title: "Pågår", stepKey: "target_audience_interviews" })]);

      // A new card from the board gets the project's current phase.
      mockAuth.mockResolvedValue({ user: { id: founder.id } });
      const created = await createCard(slug, "Ny uppgift", "TODO", undefined, undefined, undefined, undefined, undefined, undefined, CATEGORY_ORDER[0]);
      expect("cardId" in created).toBe(true);
      const newCard = await prisma.kanbanCard.findUniqueOrThrow({ where: { id: (created as { cardId: string }).cardId } });
      expect(newCard).toMatchObject({ phase: "IDEA", stepKey: null });

      // The card editor can move it to a step — only a step of that phase sticks.
      await updateCard(newCard.id, { step: { phase: "IDEA", stepKey: "market_scan_partners" } });
      expect(await prisma.kanbanCard.findUniqueOrThrow({ where: { id: newCard.id } })).toMatchObject({ phase: "IDEA", stepKey: "market_scan_partners" });
      await updateCard(newCard.id, { step: { phase: "IDEA", stepKey: "core_team_formed" } });
      expect(await prisma.kanbanCard.findUniqueOrThrow({ where: { id: newCard.id } })).toMatchObject({ phase: "IDEA", stepKey: null });

      // Going ahead with open work is allowed — and on record.
      expect(await decideIdeaGate(slug, "CONTINUE", "")).toEqual({});
      const decision = await prisma.phaseGateDecision.findFirstOrThrow({ where: { projectId: project.id } });
      expect(decision.openTaskCount).toBe(2);

      // In Uppstart, the Idé phase's unfinished cards show as earlier work.
      const pilot = await getPhaseWork(slug, "PILOT");
      expect(pilot).toMatchObject({ open: 1, earlierOpen: 2 });
    } finally {
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.user.delete({ where: { id: founder.id } });
    }
  });
});
