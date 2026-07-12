export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import Pagination from "@/components/Pagination";
import CountryMap from "@/components/CountryMap";
import { countByCountry } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Organisations — GoodTribes.org",
  description: "Organisations connected to GoodTribes.org",
};

const PAGE_SIZE = 12;

export default async function OrgListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const session = await auth();

  const [total, orgs, ownerCountries] = await Promise.all([
    prisma.organisation.count({ where: { isPublic: true } }),
    prisma.organisation.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        _count: { select: { members: true, projects: true } },
      },
    }),
    prisma.organisation.findMany({ where: { isPublic: true }, select: { owner: { select: { country: true } } } }),
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
          <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={{ page: pageStr }} basePath="/org" />
        </>
      )}
    </div>
  );
}
