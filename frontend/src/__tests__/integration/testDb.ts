import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

// Creates a User + Project scoped to one test, with a random-ish suffix so
// concurrent test cases in the same file (or a re-run against a
// not-yet-truncated database) never collide on the @unique email/slug
// columns. Not cleaned up automatically — each test's own `afterEach` (via
// withRollback below) is what removes it.
let counter = 0;
function uniqueSuffix() {
  counter += 1;
  return `${process.pid}-${counter}`;
}

export async function seedUserAndProject(tx: Tx) {
  const suffix = uniqueSuffix();
  const owner = await tx.user.create({
    data: { email: `owner-${suffix}@test.goodtribes.org`, name: "Test Owner" },
  });
  const project = await tx.project.create({
    data: { slug: `test-project-${suffix}`, title: "Test Project", ownerId: owner.id, tags: [], sdgGoals: [] },
  });
  return { owner, project };
}

export async function seedUser(tx: Tx, label: string) {
  const suffix = uniqueSuffix();
  return tx.user.create({ data: { email: `${label}-${suffix}@test.goodtribes.org`, name: label } });
}

// Every integration test runs its body inside one Prisma transaction and
// rolls it back at the end — real Postgres semantics (constraints, cascades,
// unique indexes) apply throughout, but nothing written by a test survives
// it, so tests never need to hand-clean their own rows and can't interfere
// with each other's data. Throwing a sentinel from inside `$transaction` is
// Prisma's documented way to force a rollback while still surfacing the
// test's own assertion failures (vs. errors) to Jest.
const ROLLBACK = Symbol("rollback");

export async function withRollback(run: (tx: Tx) => Promise<void>) {
  try {
    await prisma.$transaction(async (tx) => {
      await run(tx);
      throw ROLLBACK;
    });
  } catch (err) {
    if (err !== ROLLBACK) throw err;
  }
}
