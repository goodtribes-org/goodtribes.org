// Real-Postgres coverage for "Starta ett projekt utan AI": the project is
// created with AI switched off, and every AI feature then resolves to
// MANUAL — including the older tools that ran unconditionally in a legacy
// project (aiMode = NULL), which is what a plain Snabbstart used to create.

import { prisma } from "@/lib/prisma";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("../../lib/meili", () => ({ indexDocuments: jest.fn(), deleteDocument: jest.fn() }));

import { createProjectRecord } from "@/lib/createProject";
import { resolveAiMode } from "@/lib/aiMode";

const s = `${process.pid}-without-ai`;

describe("starting a project without AI", () => {
  it("switches AI off for the whole project, and leaves other starts unset", async () => {
    const founder = await prisma.user.create({ data: { email: `founder-${s}@test.goodtribes.org`, name: "Founder" } });
    const ids: string[] = [];
    try {
      const manual = await createProjectRecord({ title: `Utan AI ${s}`, ownerId: founder.id, aiMode: "MANUAL", contentLocale: "sv" });
      const plain = await createProjectRecord({ title: `Vanlig ${s}`, ownerId: founder.id, contentLocale: "sv" });
      ids.push(manual.id, plain.id);

      expect(manual.aiMode).toBe("MANUAL");
      expect(plain.aiMode).toBeNull();

      for (const feature of ["dream-conversation", "kanban-agent", "critique"] as const) {
        expect((await resolveAiMode({ projectId: manual.id, feature })).mode).toBe("MANUAL");
      }
    } finally {
      await prisma.project.deleteMany({ where: { id: { in: ids } } });
      await prisma.user.delete({ where: { id: founder.id } });
    }
  });
});
