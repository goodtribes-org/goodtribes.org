import { prisma } from "@/lib/prisma";

const TAKE = 6;

export interface MatchedProject {
  slug: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
}

export interface MatchedOrganisation {
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
}

// Candidate projects a verified organisation could sponsor/partner with,
// matched by category equality or Organisation.country (a real field, not a
// proxy) against the project owner's User.country — reuses the same
// hasSome/some-style matching idiom already used in dashboard/page.tsx, just
// with equality instead of array overlap since category/country are scalars
// here, not arrays.
export async function findMatchingProjectsForOrg(organisationId: string): Promise<MatchedProject[]> {
  const org = await prisma.organisation.findUniqueOrThrow({
    where: { id: organisationId },
    select: { category: true, country: true },
  });

  const existingPartnerProjectIds = (
    await prisma.partnership.findMany({
      where: { organisationId, status: { in: ["pending", "active"] } },
      select: { projectId: true },
    })
  ).map((p) => p.projectId);

  if (!org.category && !org.country) return [];

  return prisma.project.findMany({
    where: {
      visibility: "public",
      id: { notIn: existingPartnerProjectIds },
      OR: [
        org.category ? { category: org.category } : undefined,
        org.country ? { owner: { country: org.country } } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => !!clause),
    },
    select: { slug: true, title: true, category: true, imageUrl: true },
    take: TAKE,
  });
}

// Candidate verified organisations for a project to propose a partnership to
// — only verified orgs are surfaced since an unverified org isn't a credible
// partnership candidate (matches the same "verified" gate used elsewhere,
// e.g. site-admin/organisations verification).
export async function findMatchingOrgsForProject(projectId: string): Promise<MatchedOrganisation[]> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { category: true, owner: { select: { country: true } } },
  });

  const existingPartnerOrgIds = (
    await prisma.partnership.findMany({
      where: { projectId, status: { in: ["pending", "active"] } },
      select: { organisationId: true },
    })
  ).map((p) => p.organisationId);

  if (!project.category && !project.owner.country) return [];

  return prisma.organisation.findMany({
    where: {
      isPublic: true,
      verified: true,
      id: { notIn: existingPartnerOrgIds },
      OR: [
        project.category ? { category: project.category } : undefined,
        project.owner.country ? { country: project.owner.country } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => !!clause),
    },
    select: { slug: true, name: true, category: true, imageUrl: true },
    take: TAKE,
  });
}
