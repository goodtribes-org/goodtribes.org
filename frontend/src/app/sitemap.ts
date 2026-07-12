export const dynamic = "force-dynamic";

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";

const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";

type ChangeFrequency = MetadataRoute.Sitemap[number]["changeFrequency"];

function localizedEntries(
  path: string,
  opts: { lastModified?: Date; changeFrequency?: ChangeFrequency; priority?: number } = {},
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${base}/${locale}${path}`]),
  );

  return routing.locales.map((locale) => ({
    url: `${base}/${locale}${path}`,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  }));
}

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
    ...localizedEntries("", { lastModified: new Date(), changeFrequency: "daily", priority: 1 }),
    ...localizedEntries("/projects", { lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 }),
    ...localizedEntries("/ideas", { lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 }),
    ...localizedEntries("/members", { lastModified: new Date(), changeFrequency: "daily", priority: 0.7 }),
    ...localizedEntries("/org", { lastModified: new Date(), changeFrequency: "daily", priority: 0.7 }),
    ...localizedEntries("/about", { lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 }),
    ...localizedEntries("/privacy", { lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 }),
    ...localizedEntries("/terms", { lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 }),
  ];

  return [
    ...staticRoutes,
    ...projects.flatMap((p) =>
      localizedEntries(`/projects/${p.slug}`, {
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...ideas.flatMap((i) =>
      localizedEntries(`/ideas/${i.id}`, {
        lastModified: i.createdAt,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ),
    ...orgs.flatMap((o) =>
      localizedEntries(`/org/${o.slug}`, {
        lastModified: o.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...members.flatMap((m) =>
      localizedEntries(`/members/${m.id}`, {
        changeFrequency: "monthly",
        priority: 0.5,
      }),
    ),
  ];
}
