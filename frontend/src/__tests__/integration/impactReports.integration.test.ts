// Real-Postgres coverage for the impact-report verification flow (PRD 4d).
// These are money-adjacent-in-spirit rather than in fact — a verified report
// is what a funder or municipality is meant to rely on — so the properties
// worth proving against a real database are the authorization boundary and
// the "a decision can only be recorded once" guard, neither of which a mocked
// Prisma could actually demonstrate.
//
// Unlike most files here these tests can't use withRollback: the server
// actions under test talk to the global `prisma` client on their own
// connection, which can't see rows written inside an uncommitted test
// transaction. Each case therefore creates real rows and cleans them up in a
// `finally`, the same pattern outbox.integration.test.ts uses.

import { prisma } from "@/lib/prisma";
import { impactReportStatus } from "@/lib/impactReports";

// jest.mock's module string is a plain literal, so next/jest's SWC transform
// never applies the tsconfig `@/*` path mapping to it the way it does to real
// import specifiers — the path here has to be relative to resolve to the same
// module the code under test imports as "@/auth".
const mockAuth = jest.fn();
jest.mock("../../auth", () => ({ auth: () => mockAuth() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

import { verifyImpactReport, rejectImpactReport } from "@/app/[locale]/site-admin/impact-reports/actions";
import { createImpactReport } from "@/app/[locale]/projects/[slug]/(workspace)/impact/actions";

let seq = 0;
function suffix() {
  seq += 1;
  return `${process.pid}-ir-${seq}`;
}

async function seedScenario(opts: { adminRole: "ADMIN" | "USER" } = { adminRole: "ADMIN" }) {
  const s = suffix();
  const founder = await prisma.user.create({
    data: { email: `founder-${s}@test.goodtribes.org`, name: "Founder" },
  });
  const reviewer = await prisma.user.create({
    data: {
      email: `reviewer-${s}@test.goodtribes.org`,
      name: "Reviewer",
      siteRole: opts.adminRole,
    },
  });
  const project = await prisma.project.create({
    data: { slug: `impact-${s}`, title: "Impact Test", ownerId: founder.id, tags: [], sdgGoals: [] },
  });
  const report = await prisma.impactReport.create({
    data: {
      projectId: project.id,
      sdgGoals: [4, 10],
      metricDescription: "Pupils completing the programme",
      metricValue: 480,
      metricUnit: "elever",
      evidenceUrl: "https://example.org/evaluation.pdf",
      createdById: founder.id,
    },
  });
  return { founder, reviewer, project, report };
}

async function cleanup(ids: { founderId: string; reviewerId: string; projectId: string }) {
  // Scoped to this test's own submitter rather than a blanket deleteMany —
  // the integration database is shared across spec files.
  await prisma.outboxEvent.deleteMany({
    where: { type: "notification.create", payload: { path: ["userId"], equals: ids.founderId } },
  });
  await prisma.notification.deleteMany({ where: { userId: ids.founderId } });
  await prisma.project.deleteMany({ where: { id: ids.projectId } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.founderId, ids.reviewerId] } } });
}

afterEach(() => {
  mockAuth.mockReset();
});

describe("impact report review (integration)", () => {
  it("a site admin verifying a report stamps verifiedAt/verifiedById and notifies the submitter", async () => {
    const { founder, reviewer, project, report } = await seedScenario();
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      await verifyImpactReport(report.id, "Stämmer mot utvärderingen");

      const stored = await prisma.impactReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(stored.verifiedAt).not.toBeNull();
      expect(stored.rejectedAt).toBeNull();
      expect(stored.verifiedById).toBe(reviewer.id);
      expect(stored.reviewNote).toBe("Stämmer mot utvärderingen");
      expect(impactReportStatus(stored)).toBe("verified");

      const notifications = await prisma.notification.findMany({ where: { userId: founder.id } });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("impact_report_verified");
      expect(notifications[0].url).toBe(`/projects/${project.slug}/impact`);
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("rejecting records rejectedAt and a reason, and leaves the report unverified", async () => {
    const { founder, reviewer, project, report } = await seedScenario();
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      await rejectImpactReport(report.id, "Underlaget täcker inte hela perioden");

      const stored = await prisma.impactReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(stored.verifiedAt).toBeNull();
      expect(stored.rejectedAt).not.toBeNull();
      expect(stored.reviewNote).toBe("Underlaget täcker inte hela perioden");
      expect(impactReportStatus(stored)).toBe("rejected");
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("rejecting without a reason is refused — a project can't act on feedback it never gets", async () => {
    const { founder, reviewer, project, report } = await seedScenario();
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      await expect(rejectImpactReport(report.id, "   ")).rejects.toThrow();

      const stored = await prisma.impactReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(impactReportStatus(stored)).toBe("pending");
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("a non-admin cannot verify, and the report stays pending", async () => {
    const { founder, reviewer, project, report } = await seedScenario({ adminRole: "USER" });
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      await expect(verifyImpactReport(report.id, "")).rejects.toThrow("Forbidden");

      const stored = await prisma.impactReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(impactReportStatus(stored)).toBe("pending");
      expect(await prisma.notification.count({ where: { userId: founder.id } })).toBe(0);
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("an already-reviewed report can't be reviewed a second time", async () => {
    const { founder, reviewer, project, report } = await seedScenario();
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      await verifyImpactReport(report.id, "ok");
      await expect(rejectImpactReport(report.id, "ändrar mig")).rejects.toThrow();

      const stored = await prisma.impactReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(impactReportStatus(stored)).toBe("verified");
      expect(stored.reviewNote).toBe("ok");
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });
});

describe("impact report submission (integration)", () => {
  function form(fields: Record<string, string | string[]>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
    }
    return fd;
  }

  it("a project lead can submit a report, and unsafe input is dropped rather than stored", async () => {
    const { founder, reviewer, project } = await seedScenario();
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: founder.id, role: "FOUNDER" },
    });
    mockAuth.mockResolvedValue({ user: { id: founder.id } });

    try {
      await createImpactReport(
        project.slug,
        form({
          metricDescription: "  Ton CO2 undviket  ",
          metricValue: "12.5",
          metricUnit: "ton",
          // 99 isn't a real SDG and the scheme isn't linkable — both are
          // dropped rather than rejecting the whole submission.
          sdgGoals: ["13", "99", "13"],
          evidenceUrl: "javascript:alert(1)",
          periodStart: "2026-01-01",
          periodEnd: "2026-06-30",
        })
      );

      const stored = await prisma.impactReport.findFirstOrThrow({
        where: { projectId: project.id, metricDescription: "Ton CO2 undviket" },
      });
      expect(stored.sdgGoals).toEqual([13]);
      expect(stored.evidenceUrl).toBeNull();
      expect(stored.metricValue).toBe(12.5);
      expect(stored.createdById).toBe(founder.id);
      expect(impactReportStatus(stored)).toBe("pending");
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("a submission with no valid SDG goal is not stored", async () => {
    const { founder, reviewer, project } = await seedScenario();
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: founder.id, role: "FOUNDER" },
    });
    mockAuth.mockResolvedValue({ user: { id: founder.id } });

    try {
      await createImpactReport(
        project.slug,
        form({ metricDescription: "Utan mål", metricValue: "5", sdgGoals: ["42"] })
      );

      expect(
        await prisma.impactReport.count({ where: { projectId: project.id, metricDescription: "Utan mål" } })
      ).toBe(0);
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });

  it("a logged-in non-member cannot submit a report for someone else's project", async () => {
    // A plain logged-in user with no ProjectMember row and no site role, so
    // the refusal can only be coming from the project-membership check.
    const { founder, reviewer, project } = await seedScenario({ adminRole: "USER" });
    mockAuth.mockResolvedValue({ user: { id: reviewer.id } });

    try {
      // assertOwnerOrAdmin bails out via redirect(), which throws NEXT_REDIRECT
      await expect(
        createImpactReport(
          project.slug,
          form({ metricDescription: "Fusk", metricValue: "1", sdgGoals: ["4"] })
        )
      ).rejects.toThrow();

      expect(await prisma.impactReport.count({ where: { projectId: project.id } })).toBe(1);
    } finally {
      await cleanup({ founderId: founder.id, reviewerId: reviewer.id, projectId: project.id });
    }
  });
});
