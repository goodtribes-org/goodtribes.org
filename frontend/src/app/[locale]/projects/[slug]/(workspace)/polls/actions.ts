"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";


export async function createPoll(formData: FormData, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const type = (formData.get("type") as string | null)?.trim() || "yes_no";
  const visibility = (formData.get("visibility") as string | null)?.trim() || "live";
  const isBinding = formData.get("isBinding") === "on";
  const deadlineRaw = (formData.get("deadline") as string | null)?.trim() || null;
  const quorumRaw = (formData.get("quorumPercent") as string | null)?.trim() || null;

  if (!title) return;

  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
  const quorumPercent = quorumRaw !== null && quorumRaw !== "" ? parseFloat(quorumRaw) : null;

  let options: { label: string; description: string | null; sortOrder: number }[] = [];

  if (type === "yes_no") {
    options = [
      { label: "Ja", description: null, sortOrder: 0 },
      { label: "Nej", description: null, sortOrder: 1 },
    ];
  } else {
    // Parse dynamic options from formData
    let i = 0;
    while (formData.has(`option_label_${i}`)) {
      const label = (formData.get(`option_label_${i}`) as string | null)?.trim() ?? "";
      const desc = (formData.get(`option_description_${i}`) as string | null)?.trim() || null;
      if (label) {
        options.push({ label, description: desc, sortOrder: i });
      }
      i++;
    }
  }

  const poll = await prisma.poll.create({
    data: {
      projectSlug,
      createdById: session.user.id,
      title,
      description,
      type,
      visibility,
      isBinding,
      deadline,
      quorumPercent,
      options: {
        create: options,
      },
    },
  });

  revalidatePath(`/projects/${projectSlug}/polls`);
  redirect(`/projects/${projectSlug}/polls/${poll.id}`);
}

export async function castVote(
  pollId: string,
  votes: { optionId: string; weight: number }[],
  projectSlug: string,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const userId = session.user.id;

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return { error: "Poll not found" };
  if (poll.status !== "open") return { error: "Poll is closed" };

  // Check deadline
  if (poll.deadline && new Date() > poll.deadline) {
    return { error: "Poll deadline has passed" };
  }

  // Fetch user token balance for this project
  const aggregate = await prisma.tokenLedger.aggregate({
    where: { userId, projectSlug },
    _sum: { tokens: true },
  });
  const tokenBalance = Math.max(aggregate._sum.tokens ?? 0, 1);

  // Verify total weight does not exceed token balance
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight > tokenBalance) {
    return { error: "Insufficient token balance" };
  }

  // Replace existing votes: delete then create
  await prisma.pollVote.deleteMany({ where: { pollId, userId } });

  if (votes.length > 0) {
    await prisma.pollVote.createMany({
      data: votes.map((v) => ({
        pollId,
        pollOptionId: v.optionId,
        userId,
        tokenWeight: v.weight,
      })),
    });
  }

  revalidatePath(`/projects/${projectSlug}/polls/${pollId}`);
  return { success: true };
}

export async function closePoll(pollId: string, projectSlug: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });

  if (!project) return { error: "Project not found" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) {
    return { error: "Not authorized" };
  }

  const poll = await prisma.poll.update({
    where: { id: pollId },
    data: { status: "closed", closedAt: new Date() },
    include: { options: true },
  });

  // legal_type_change polls (PRD 4c) drive a linked LegalTypeChangeRequest
  // out of `pending` on close — every other poll type is unaffected.
  if (poll.type === "legal_type_change") {
    const changeRequest = await prisma.legalTypeChangeRequest.findFirst({
      where: { pollId, status: "pending" },
    });
    if (changeRequest) {
      const tally = await prisma.pollVote.groupBy({
        by: ["pollOptionId"],
        where: { pollId },
        _sum: { tokenWeight: true },
      });
      const weightByOption = new Map(tally.map((t) => [t.pollOptionId, t._sum.tokenWeight ?? 0]));
      const yesOption = poll.options.find((o) => o.label === "Ja");
      const noOption = poll.options.find((o) => o.label === "Nej");
      const yesWeight = yesOption ? weightByOption.get(yesOption.id) ?? 0 : 0;
      const noWeight = noOption ? weightByOption.get(noOption.id) ?? 0 : 0;

      await prisma.legalTypeChangeRequest.update({
        where: { id: changeRequest.id },
        data: { status: yesWeight > noWeight ? "approved_by_members" : "rejected_by_members" },
      });
    }
  }

  revalidatePath(`/projects/${projectSlug}/polls`);
  revalidatePath(`/projects/${projectSlug}/polls/${pollId}`);
  revalidatePath(`/projects/${projectSlug}/legal-type`);
  return { success: true };
}
