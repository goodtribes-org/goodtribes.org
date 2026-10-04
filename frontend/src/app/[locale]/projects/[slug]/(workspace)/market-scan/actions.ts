"use server";

import { logToolWork } from "@/lib/toolWork";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { safeExternalUrl } from "@/lib/impactReports";
import type { MarketScanEntryType } from "@prisma/client";

const VALID_TYPES: MarketScanEntryType[] = ["COMPETITOR", "TREND", "PARTNER_PROSPECT", "REGULATION"];

export async function addMarketScanEntry(
  projectSlug: string,
  data: { type: string; name: string; description: string; relevanceNote: string; sourceUrl: string; linkedField?: string }
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
      linkedField: data.linkedField?.trim() || null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  await logToolWork(project.id, session.user.id, "marketScan");
  revalidatePath(`/projects/${projectSlug}/market-scan`);
  revalidatePath(`/projects/${projectSlug}/ide`);
  return { entry };
}

export async function deleteMarketScanEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };

  const entry = await prisma.marketScanEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { error: "Entry not found" };
  // Your own entries, or — as a project lead — any, including the AI's finds
  // ("Ta bort" in the template, #207).
  if (entry.createdById !== session.user.id) {
    const project = await prisma.project.findUnique({ where: { slug: entry.projectSlug }, select: { id: true } });
    if (!project || !(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Not authorized" };
  }

  await prisma.marketScanEntry.delete({ where: { id: entryId } });
  revalidatePath(`/projects/${entry.projectSlug}/market-scan`);
  revalidatePath(`/projects/${entry.projectSlug}/ide`);
  return { ok: true };
}

// "✓ Stämmer": a member has checked the find (#207).
export async function confirmMarketScanEntry(entryId: string, confirmed: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const entry = await prisma.marketScanEntry.findUnique({ where: { id: entryId }, select: { projectSlug: true } });
  if (!entry) return { error: "Entry not found" };
  const project = await prisma.project.findUnique({ where: { slug: entry.projectSlug }, select: { id: true } });
  if (!project || !(await isRealMember(project.id, session.user.id))) return { error: "Not a project member" };
  await prisma.marketScanEntry.update({ where: { id: entryId }, data: { confirmedAt: confirmed ? new Date() : null } });
  revalidatePath(`/projects/${entry.projectSlug}/ide`);
  return { ok: true };
}

// "Er plats i landskapet": saving it makes it the team's (no longer an AI draft).
export async function saveMarketScanConclusion(
  projectSlug: string,
  data: { strengths: string; gap: string; firstContacts: string },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not logged in" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project || !(await isRealMember(project.id, session.user.id))) return { error: "Not a project member" };
  const values = { strengths: data.strengths.trim() || null, gap: data.gap.trim() || null, firstContacts: data.firstContacts.trim() || null, createdByAi: false };
  await prisma.marketScanConclusion.upsert({ where: { projectSlug }, create: { projectSlug, ...values }, update: values });
  revalidatePath(`/projects/${projectSlug}/ide`);
  return { ok: true };
}

// "Ta fram omvärldsbevakningen": the AI searches from the canvas and fills
// the template (lib/marketScan.ts). On click only, in AGENT or ASSIST mode.
export async function runMarketScanAction(projectSlug: string): Promise<{ found: number } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Inte inloggad" };
  const project = await prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
  if (!project) return { error: "Projektet hittades inte" };
  if (!(await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES))) return { error: "Forbidden" };
  const { getAiClientFor, aiGateMessage } = await import("@/lib/aiMode");
  const gate = await getAiClientFor({
    feature: "dream-conversation",
    kind: "assist",
    userId: session.user.id,
    projectId: project.id,
    stepKey: "market_scan_partners",
    language: "project",
  });
  if (!gate.ok) return { error: aiGateMessage(gate.reason) };
  try {
    const { runAndSaveMarketScan } = await import("@/lib/marketScan");
    const found = await runAndSaveMarketScan(gate.client, projectSlug);
    revalidatePath(`/projects/${projectSlug}`, "layout");
    if (found === 0) return { error: "AI:n hittade inget med säker källa den här gången. Försök igen, eller fyll i mallen själv." };
    return { found };
  } catch {
    return { error: "Omvärldsbevakningen kunde inte köras just nu. Försök igen." };
  }
}
