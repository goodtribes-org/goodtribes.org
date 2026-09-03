export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isRealMember } from "@/lib/authz";
import { safeExternalUrl } from "@/lib/impactReports";
import MarketScanList from "./MarketScanList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Omvärldsbevakning & Partners — GoodTribes.org` };
}

export default async function MarketScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) notFound();

  const canAdd = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;

  const rawEntries = await prisma.marketScanEntry.findMany({
    where: { projectSlug: slug },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  // Re-validate sourceUrl at render time too, same both-ways discipline as
  // ImpactReport.evidenceUrl (see lib/impactReports.ts) — defense in depth
  // independent of whether the save path (actions.ts) already checked it.
  const entries = rawEntries.map((e) => ({ ...e, sourceUrl: safeExternalUrl(e.sourceUrl) }));

  return (
    <MarketScanList
      projectSlug={slug}
      entries={entries}
      canAdd={canAdd}
      currentUserId={session?.user?.id ?? null}
    />
  );
}
