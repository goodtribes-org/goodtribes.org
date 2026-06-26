export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma"

const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, ideas, orgs, members] = await Promise.all([
    prisma.project.findMany({
      where: { visibility: "public" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.idea.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.organisation.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.user.findMany({
      where: { showProfile: true, name: { not: null } },
      select: { id: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/projects`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/ideas`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/members`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/org`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  return [
    ...staticRoutes,
    ...projects.map((p) => ({
      url: `${base}/projects/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...ideas.map((i) => ({
      url: `${base}/ideas/${i.id}`,
      lastModified: i.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...orgs.map((o) => ({
      url: `${base}/org/${o.slug}`,
      lastModified: o.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...members.map((m) => ({
      url: `${base}/members/${m.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
