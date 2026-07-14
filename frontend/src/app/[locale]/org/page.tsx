export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import Pagination from "@/components/Pagination";
import CountryMap from "@/components/CountryMap";
import { countByCountry } from "@/lib/geo";
import OrgFilters from "@/components/OrgFiltersContainer";

export const metadata: Metadata = {
  title: "Organisations — GoodTribes.org",
  description: "Organisations connected to GoodTribes.org",
};

const PAGE_SIZE = 12;

export default async function OrgListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; skill?: string; page?: string }>;
}) {
  const { q, category, skill, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const session = await auth();

  const where: Prisma.OrganisationWhereInput = {
    isPublic: true,
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]} : {}),
    ...(category ? { category } : {}),
    ...(skill ? { neededSkills: { some: { skill: { slug: skill } } } } : {}),
  };

  const [total, orgs, ownerCountries, skillsSought] = await Promise.all([
    prisma.organisation.count({ where }),
    prisma.organisation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true, projects: true } },
        neededSkills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.organisation.findMany({ where, select: { owner: { select: { country: true } } } }),
    prisma.skill.findMany({
      where: { organisations: { some: { organisation: { isPublic: true } } } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const countryCounts = countByCountry(ownerCountries.map((o) => o.owner.country));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark-slate">
          Organisations <span className="text-dark-slate/40 font-normal">({total})</span>
        </h1>
        {session?.user?.id && (
          <Link
            href="/org/new"
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
          >
            + New organisation
          </Link>
        )}
      </div>

      {Object.keys(countryCounts).length > 0 && (
        <div className="mb-6">
          <CountryMap counts={countryCounts} unitLabel="organisations" />
        </div>
      )}

      <OrgFilters q={q} category={category} skill={skill} skills={skillsSought} />

      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">No organisations yet.</p>
          {session?.user?.id && (
            <Link href="/org/new" className="text-coral hover:underline text-sm">Create the first one →</Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {orgs.map((org) => (
              <Link
                key={org.slug}
                href={`/org/${org.slug}`}
                className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-dry-sage to-muted-teal/40">
                  {org.imageUrl ? (
                    <Image
                      src={org.imageUrl}
                      alt={org.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">
                        {org.name}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{org.name}</p>
                  <p className="text-xs text-dark-slate/50 mb-2">
                    by <span className="text-coral">{org.owner.name ?? "Unknown"}</span>
                  </p>
                  {org.description && (
                    <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
                      {org.description}
                    </p>
                  )}
                  {org.neededSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {org.neededSkills.slice(0, 3).map(({ skill: s }) => (
                        <span
                          key={s.id}
                          className="text-[10px] bg-seagrass/15 text-seagrass border border-seagrass/30 rounded px-1.5 py-0.5 font-medium"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                    <div className="px-1">
                      <p className="text-xs font-semibold text-dark-slate">{org._count.members}</p>
                      <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
                    </div>
                    <div className="px-1">
                      <p className="text-xs font-semibold text-dark-slate">{org._count.projects}</p>
                      <p className="text-[10px] text-dark-slate/50 leading-tight">Projects</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={{ q, category, skill, page: pageStr }} basePath="/org" />
        </>
      )}
    </div>
  );
}
