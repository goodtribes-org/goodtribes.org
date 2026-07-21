import { prisma } from "@/lib/prisma";

export interface InstanceStat {
  slug: string;
  title: string;
  region: string | null;
  country: string | null;
  contributors: number;
  tokens: number;
  tasksDone: number;
  fundsRaised: number;
}

export interface NetworkStats {
  totalContributors: number;
  totalTokens: number;
  totalTasksDone: number;
  totalFundsRaised: number;
  instances: InstanceStat[]; // parent first, then each approved instance
}

// Batched across the parent + its approved instances in four groupBy calls total,
// rather than N sequential per-project queries like calculateMaturityScore does
// for a single project (see lib/projectMaturity.ts).
export async function getNetworkStats(parentSlug: string): Promise<NetworkStats> {
  const parent = await prisma.project.findUniqueOrThrow({
    where: { slug: parentSlug },
    select: { id: true, slug: true, title: true, fundingCampaign: { select: { id: true } } },
  });

  const approvedInstances = await prisma.projectInstance.findMany({
    where: { parentSlug, status: "approved" },
    select: {
      region: true,
      country: true,
      child: { select: { id: true, slug: true, title: true, fundingCampaign: { select: { id: true } } } },
    },
  });

  const nodes = [
    { id: parent.id, slug: parent.slug, title: parent.title, region: null as string | null, country: null as string | null, campaignId: parent.fundingCampaign?.id ?? null },
    ...approvedInstances.map((inst) => ({
      id: inst.child.id,
      slug: inst.child.slug,
      title: inst.child.title,
      region: inst.region,
      country: inst.country,
      campaignId: inst.child.fundingCampaign?.id ?? null,
    })),
  ];
  const projectIds = nodes.map((n) => n.id);
  const slugs = nodes.map((n) => n.slug);
  const campaignIds = nodes.map((n) => n.campaignId).filter((id): id is string => !!id);

  const [members, tasks, tokens, pledges] = await Promise.all([
    prisma.projectMember.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, role: { not: "FOLLOWER" } },
      _count: { _all: true },
    }),
    prisma.kanbanCard.groupBy({
      by: ["projectSlug"],
      where: { projectSlug: { in: slugs }, column: "DONE" },
      _count: { _all: true },
    }),
    prisma.tokenLedger.groupBy({
      by: ["projectSlug"],
      where: { projectSlug: { in: slugs } },
      _sum: { tokens: true },
    }),
    campaignIds.length
      ? prisma.fundingPledge.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: campaignIds } },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const membersByProject = new Map(members.map((m) => [m.projectId, m._count._all]));
  const tasksBySlug = new Map(tasks.map((t) => [t.projectSlug, t._count._all]));
  const tokensBySlug = new Map(tokens.map((t) => [t.projectSlug, t._sum.tokens ?? 0]));
  const pledgesByCampaign = new Map(pledges.map((p) => [p.campaignId, p._sum.amount ?? 0]));

  const instances: InstanceStat[] = nodes.map((n) => ({
    slug: n.slug,
    title: n.title,
    region: n.region,
    country: n.country,
    contributors: membersByProject.get(n.id) ?? 0,
    tokens: tokensBySlug.get(n.slug) ?? 0,
    tasksDone: tasksBySlug.get(n.slug) ?? 0,
    fundsRaised: n.campaignId ? pledgesByCampaign.get(n.campaignId) ?? 0 : 0,
  }));

  return {
    totalContributors: instances.reduce((s, i) => s + i.contributors, 0),
    totalTokens: instances.reduce((s, i) => s + i.tokens, 0),
    totalTasksDone: instances.reduce((s, i) => s + i.tasksDone, 0),
    totalFundsRaised: instances.reduce((s, i) => s + i.fundsRaised, 0),
    instances,
  };
}
