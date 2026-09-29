import { prisma } from "@/lib/prisma";
import { ideaGateCriteria } from "@/lib/phaseGate";
import { withRollback, seedUserAndProject } from "./testDb";

describe("Assumption (real Postgres)", () => {
  it("applies defaults and cascades with its project", async () => {
    await withRollback(async (tx) => {
      const { project } = await seedUserAndProject(tx);
      const a = await tx.assumption.create({ data: { projectId: project.id, text: "Föräldrar vill ha läxhjälp" } });
      expect(a).toMatchObject({ risk: "MEDIUM", status: "UNTESTED", origin: "USER", sourceEntity: null });
      await tx.project.delete({ where: { id: project.id } });
      expect(await tx.assumption.count({ where: { id: a.id } })).toBe(0);
    });
  });

  // ideaGateCriteria reads through the global client, so this one writes
  // for real and cleans up after itself (project delete cascades).
  it("drives the gate's risky_assumptions_tested criterion", async () => {
    const owner = await prisma.user.create({ data: { email: `assume-${process.pid}-${Date.now()}@test.goodtribes.org`, name: "Owner" } });
    const project = await prisma.project.create({
      data: { slug: `assume-${process.pid}-${Date.now()}`, title: "T", ownerId: owner.id, tags: [], sdgGoals: [] },
    });
    try {
      const met = async () => (await ideaGateCriteria(project.id, project.slug)).criteria.find((c) => c.key === "risky_assumptions_tested")?.met;
      expect(await met()).toBe(false);
      const high = await prisma.assumption.create({ data: { projectId: project.id, text: "A", risk: "HIGH" } });
      await prisma.assumption.create({ data: { projectId: project.id, text: "B", risk: "LOW", status: "SUPPORTED" } });
      expect(await met()).toBe(false);
      await prisma.assumption.update({ where: { id: high.id }, data: { status: "REFUTED" } });
      expect(await met()).toBe(true);
    } finally {
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.user.delete({ where: { id: owner.id } });
    }
  });
});
