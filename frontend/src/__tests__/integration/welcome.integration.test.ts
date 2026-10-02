// Real-Postgres coverage for the welcome step after a first sign-in: the
// name is saved and onboarding is marked done, then the person goes back to
// where they were heading — or, with nowhere in particular, to the goal
// they picked. A callbackUrl to another site is ignored.

import { prisma } from "@/lib/prisma";

const mockAuth = jest.fn();
jest.mock("../../auth", () => ({ auth: () => mockAuth() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn(), unstable_cache: (fn: unknown) => fn }));
jest.mock("next-intl/server", () => ({ getLocale: async () => "sv" }));

import { saveWelcome } from "@/app/[locale]/welcome/actions";

const s = `${process.pid}-welcome`;

// redirect() throws NEXT_REDIRECT; its digest carries the target.
async function redirectOf(fields: Record<string, string>): Promise<string> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  try {
    await saveWelcome(fd);
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2];
    throw e;
  }
  throw new Error("expected a redirect");
}

describe("the welcome step", () => {
  it("saves the name and returns the person to where they were going", async () => {
    const user = await prisma.user.create({ data: { email: `new-${s}@test.goodtribes.org` } });
    try {
      mockAuth.mockResolvedValue({ user: { id: user.id } });

      expect(await redirectOf({ name: "  Anna Andersson  ", callbackUrl: "/sv/projects/new/samtal/abc" })).toBe("/sv/projects/new/samtal/abc");
      expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ name: "Anna Andersson", onboardingDone: true });

      expect(await redirectOf({ name: "Anna", callbackUrl: "https://evil.example/x", goal: "join" })).toBe("/sv/my-goodtribes?tab=find");
      expect(await redirectOf({ name: "Anna", callbackUrl: "/sv", goal: "start" })).toBe("/sv/projects/new");
      expect(await redirectOf({ name: "Anna" })).toBe("/sv/my-goodtribes");

      await expect(saveWelcome(Object.assign(new FormData(), {}))).rejects.toThrow("Namn krävs");
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
