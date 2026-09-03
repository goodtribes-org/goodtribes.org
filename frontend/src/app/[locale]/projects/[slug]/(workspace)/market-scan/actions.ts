"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isRealMember } from "@/lib/authz";
import { safeExternalUrl } from "@/lib/impactReports";
import type { MarketScanEntryType } from "@prisma/client";

const VALID_TYPES: MarketScanEntryType[] = ["COMPETITOR", "TREND", "PARTNER_PROSPECT", "REGULATION"];

export async function addMarketScanEntry(
  projectSlug: string,
  data: { type: string; name: string; description: string; relevanceNote: string; sourceUrl: string }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const type = data.type as MarketScanEntryType;
  const name = data.name.trim();
  const description = data.description.trim();
  if (!VALID_TYPES.includes(type) || !name || !description) return { error: "Missing required fields" };

  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Project not found" };
  if (!(await isRealMember(project.id, session.user.id))) return { error: "Not a project member" };

  const entry = await prisma.marketScanEntry.create({
    data: {
      projectSlug,
      type,
      name,
      description,
      relevanceNote: data.relevanceNote.trim() || null,
      sourceUrl: safeExternalUrl(data.sourceUrl),
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  revalidatePath(`/projects/${projectSlug}/market-scan`);
  return { entry };
}

export async function deleteMarketScanEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const entry = await prisma.marketScanEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "Entry not found" };
  if (entry.createdById !== session.user.id) return { error: "Not authorized" };

  await prisma.marketScanEntry.delete({ where: { id: entryId } });
  revalidatePath(`/projects/${entry.projectSlug}/market-scan`);
  return { ok: true };
}
