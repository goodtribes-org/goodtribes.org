// Real-Postgres coverage for the AI-guided project journey's gates: one
// project walked through every phase gate via the real server actions —
// Idé → Uppstart → Lansering → Etablera → Skala → Impact → the final
// next-step decision. The gate decisions themselves never call AI (only the
// optional briefs do), so this runs without ANTHROPIC_API_KEY, exactly like
// a project whose team decides without asking for a brief.
//
// What a mocked Prisma couldn't show: the phase really advances, every
// decision is recorded with the right fromPhase and unmet criteria, the
// pilot's go/no-go lands on PilotEvaluation, and the founder-only rules and
// wrong-phase guard hold. Same real-rows-plus-cleanup pattern as
// impactReports.integration.test.ts (the actions use the global client).

import { prisma } from "@/lib/prisma";

const mockAuth = jest.fn();
jest.mock("../../auth", () => ({ auth: () => mockAuth() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => "sv",
}));
jest.mock("../../lib/meili", () => ({ indexDocuments: jest.fn(), deleteDocument: jest.fn() }));

import { decideIdeaGate } from "@/app/[locale]/projects/[slug]/(workspace)/ide/actions";
import { decideUppstartGate } from "@/app/[locale]/projects/[slug]/(workspace)/uppstart/actions";
import { decideLanseringGate } from "@/app/[locale]/projects/[slug]/(workspace)/lansering/actions";
import { decideEtableraGate } from "@/app/[locale]/projects/[slug]/(workspace)/etablera/actions";
import { decideSkalaGate } from "@/app/[locale]/projects/[slug]/(workspace)/skala/actions";
import { decideNextStep } from "@/app/[locale]/projects/[slug]/(workspace)/impactfasen/actions";

const s = `${process.pid}-journey`;
const as = (userId: string) => mockAuth.mockResolvedValue({ user: { id: userId } });
const phaseOf = async (id: string) => (await prisma.project.findUniqueOrThrow({ where: { id }, select: { phase: true } })).phase;

describe("the phase journey, gate by gate", () => {
  it("walks a project from Idé to the final decision", async () => {
    const founder = await prisma.user.create({ data: { email: `founder-${s}@test.goodtribes.org`, name: "Founder" } });
    const admin = await prisma.user.create({ data: { email: `admin-${s}@test.goodtribes.org`, name: "Admin" } });
    const project = await prisma.project.create({ data: { slug: `journey-${s}`, title: "Journey", ownerId: founder.id, phase: "IDEA" } });
    await prisma.projectMember.createMany({
      data: [
        { projectId: project.id, userId: founder.id, role: "FOUNDER" },
        { projectId: project.id, userId: admin.id, role: "ADMIN" },
      ],
    });
    const slug = project.slug;

    try {
      // Idé: ADJUST is recorded with every unmet criterion, and stays in Idé.
      as(founder.id);
      expect(await decideIdeaGate(slug, "ADJUST", "Fler intervjuer först")).toEqual({});
      const adjust = await prisma.phaseGateDecision.findFirstOrThrow({ where: { projectId: project.id } });
      expect(adjust).toMatchObject({ fromPhase: "IDEA", outcome: "ADJUST", note: "Fler intervjuer först" });
      expect(adjust.missing).toContain("target_audience_interviews");
      expect(await phaseOf(project.id)).toBe("IDEA");

      // Only the founder may pause; an admin can decide everything else.
      as(admin.id);
      expect((await decideIdeaGate(slug, "PAUSE", "")).error).toBeTruthy();
      expect(await decideIdeaGate(slug, "SOMETHING", "")).toEqual({ error: "Okänt beslut" });

      // A gate can only be decided in its own phase.
      expect((await decideLanseringGate(slug, "CONTINUE", "")).error).toBeTruthy();

      expect(await decideIdeaGate(slug, "CONTINUE", "")).toEqual({});
      expect(await phaseOf(project.id)).toBe("PILOT");

      expect(await decideUppstartGate(slug, "CONTINUE", "")).toEqual({ next: `/projects/${slug}/guide/production` });
      expect(await phaseOf(project.id)).toBe("PRODUCTION");

      // Lansering's go also lands on the pilot evaluation and ticks go/no-go.
      expect(await decideLanseringGate(slug, "CONTINUE", "Go!")).toEqual({ next: `/projects/${slug}/guide/establish` });
      expect(await phaseOf(project.id)).toBe("ESTABLISH");
      expect((await prisma.pilotEvaluation.findUniqueOrThrow({ where: { projectSlug: slug } })).decision).toBe("GO");
      expect(await prisma.initiativeChecklistItem.findFirst({ where: { projectId: project.id, itemKey: "pilot_go_no_go", completedAt: { not: null } } })).not.toBeNull();

      expect(await decideEtableraGate(slug, "CONTINUE", "")).toEqual({ next: `/projects/${slug}/guide/scale` });
      expect(await phaseOf(project.id)).toBe("SCALE");

      expect(await decideSkalaGate(slug, "CONTINUE", "")).toEqual({ next: `/projects/${slug}/guide/impact` });
      expect(await phaseOf(project.id)).toBe("IMPACT");

      // The last decision: closing is the founder's call.
      expect((await decideNextStep(slug, "close")).error).toBeTruthy();
      as(founder.id);
      expect(await decideNextStep(slug, "continue")).toEqual({});
      expect((await prisma.impactFollowup.findUniqueOrThrow({ where: { projectSlug: slug } })).nextStepDecision).toBe("CONTINUE");

      // Every gate left exactly one trace, in order.
      const trail = await prisma.phaseGateDecision.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" }, select: { fromPhase: true, outcome: true } });
      expect(trail).toEqual([
        { fromPhase: "IDEA", outcome: "ADJUST" },
        { fromPhase: "IDEA", outcome: "CONTINUE" },
        { fromPhase: "PILOT", outcome: "CONTINUE" },
        { fromPhase: "PRODUCTION", outcome: "CONTINUE" },
        { fromPhase: "ESTABLISH", outcome: "CONTINUE" },
        { fromPhase: "SCALE", outcome: "CONTINUE" },
      ]);
      const transitions = await prisma.phaseTransition.findMany({ where: { projectId: project.id }, orderBy: { changedAt: "asc" }, select: { toPhase: true } });
      expect(transitions.map((t) => t.toPhase)).toEqual(["PILOT", "PRODUCTION", "ESTABLISH", "SCALE", "IMPACT"]);
    } finally {
      await prisma.project.delete({ where: { id: project.id } });
      await prisma.user.deleteMany({ where: { id: { in: [founder.id, admin.id] } } });
    }
  });
});
