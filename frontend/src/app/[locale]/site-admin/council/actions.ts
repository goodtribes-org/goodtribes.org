"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";

const COUNCIL_SEAT_COUNT = 5;
const COUNCIL_TERM_MONTHS = 12;

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);
  return session.user.id;
}

// Bootstraps a new Granskningsrådet election (PRD 5.53). Site-admin starts
// it since no council exists yet to run its own elections — a one-time
// chicken-and-egg exception, not an ongoing staff role in council affairs.
export async function createCouncilElection(formData: FormData) {
  const adminId = await requireAdmin();

  const title = (formData.get("title") as string)?.trim() || "Val till Granskningsrådet";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const deadlineRaw = formData.get("deadline") as string | null;
  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

  await prisma.platformPoll.create({
    data: {
      title,
      description,
      type: "council_election",
      seatCount: COUNCIL_SEAT_COUNT,
      termMonths: COUNCIL_TERM_MONTHS,
      deadline,
      createdById: adminId,
    },
  });

  revalidatePath("/site-admin/council");
  revalidatePath("/granskningsradet");
}

// Tallies GT-weighted votes, seats the top `seatCount` candidates as
// ReviewCouncilMembers for `termMonths`, and closes the poll.
export async function closeCouncilElection(pollId: string) {
  await requireAdmin();

  const poll = await prisma.platformPoll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });
  if (!poll || poll.status !== "open") throw new Error("Election not open");

  const tally = await prisma.platformPollVote.groupBy({
    by: ["pollOptionId"],
    where: { pollId },
    _sum: { gtWeight: true },
  });
  const weightByOption = new Map(tally.map((t) => [t.pollOptionId, t._sum.gtWeight ?? 0]));

  const ranked = poll.options
    .filter((o) => !!o.candidateId)
    .map((o) => ({ candidateId: o.candidateId!, weight: weightByOption.get(o.id) ?? 0 }))
    .sort((a, b) => b.weight - a.weight);

  const seatCount = poll.seatCount ?? COUNCIL_SEAT_COUNT;
  const termMonths = poll.termMonths ?? COUNCIL_TERM_MONTHS;
  const winners = ranked.slice(0, seatCount).filter((w) => w.weight > 0);

  const termStart = new Date();
  const termEnd = new Date(termStart);
  termEnd.setMonth(termEnd.getMonth() + termMonths);

  await prisma.$transaction([
    ...winners.map((w) =>
      prisma.reviewCouncilMember.create({
        data: {
          userId: w.candidateId,
          termStart,
          termEnd,
          electedViaPollId: poll.id,
        },
      })
    ),
    prisma.platformPoll.update({
      where: { id: pollId },
      data: { status: "closed", closedAt: new Date() },
    }),
  ]);

  revalidatePath("/site-admin/council");
  revalidatePath("/granskningsradet");
}
