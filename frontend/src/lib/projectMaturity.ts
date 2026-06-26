import { prisma } from "@/lib/prisma"


export async function calculateMaturityScore(projectSlug: string): Promise<number> {
  // Fetch the project to get its id (needed for member/milestone queries)
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true, fundingCampaign: { select: { id: true } } },
  });
  if (!project) throw new Error(`Project not found: ${projectSlug}`);

  const [
    memberCount,
    doneTaskCount,
    completedMilestoneCount,
    tokenSum,
    impactCount,
    blogCount,
    forumCount,
  ] = await Promise.all([
    prisma.projectMember.count({ where: { projectId: project.id } }),
    prisma.kanbanCard.count({ where: { projectSlug, column: "DONE" } }),
    prisma.milestone.count({ where: { projectId: project.id, status: "done" } }),
    prisma.tokenLedger.aggregate({ where: { projectSlug }, _sum: { tokens: true } }),
    prisma.impactMetric.count({ where: { projectSlug } }),
    prisma.blogPost.count({ where: { projectSlug } }),
    prisma.forumPost.count({ where: { projectSlug } }),
  ]);

  // Funding: sum pledges via the campaign if one exists
  let fundingTotal = 0;
  if (project.fundingCampaign) {
    const pledgeSum = await prisma.fundingPledge.aggregate({
      where: { campaignId: project.fundingCampaign.id },
      _sum: { amount: true },
    });
    fundingTotal = pledgeSum._sum.amount ?? 0;
  }

  const totalTokens = tokenSum._sum.tokens ?? 0;
  const contentPosts = blogCount + forumCount;

  // Weighted score (max 100)
  const membersScore   = Math.min(memberCount * 5, 20);
  const tasksScore     = Math.min(doneTaskCount * 2, 20);
  const milestonesScore= Math.min(completedMilestoneCount * 10, 20);
  const tokensScore    = Math.min(totalTokens / 10, 15);
  const fundingScore   = fundingTotal > 0 ? 10 : 0;
  const impactScore    = impactCount > 0 ? 10 : 0;
  const contentScore   = Math.min(contentPosts, 5);

  const score = Math.round(
    membersScore + tasksScore + milestonesScore + tokensScore +
    fundingScore + impactScore + contentScore
  );

  const breakdown = {
    members: membersScore,
    tasks: tasksScore,
    milestones: milestonesScore,
    tokens: tokensScore,
    funding: fundingScore,
    impact: impactScore,
    content: contentScore,
  };

  await prisma.projectMaturity.upsert({
    where: { projectSlug },
    update: { score, scoreBreakdown: breakdown, calculatedAt: new Date() },
    create: { projectSlug, score, scoreBreakdown: breakdown },
  });

  return score;
}
