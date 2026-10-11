"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRealMember } from "@/lib/authz";
import { logActivity } from "@/lib/activity";
import { toProxyUrl } from "@/lib/storageUrl";
import { parsePulseValue, PULSE_PHASES, snoozeUntil } from "@/lib/impactPulse";

// Impactpuls (#335): the month's answer, or "Påminn mig om en vecka". Every
// real member may answer — the whole team does the work (followers may not).

async function requireMember(slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, phase: true, hiddenAt: true } });
  if (!project || project.hiddenAt || !(await isRealMember(project.id, session.user.id))) return null;
  return { project, userId: session.user.id };
}

function done(slug: string) {
  revalidatePath(`/projects/${slug}/puls`);
  revalidatePath(`/projects/${slug}/impactfasen`);
  revalidatePath(`/projects/${slug}/impact`);
  return {};
}

export async function savePulse(
  slug: string,
  input: { note: string; imageUrl: string; metricId: string; value: string },
): Promise<{ error?: string }> {
  const ctx = await requireMember(slug);
  if (!ctx) return { error: "Forbidden" };
  if (!PULSE_PHASES.includes(ctx.project.phase)) return { error: "Pulsen börjar i Lansering" };
  const note = input.note.trim().slice(0, 500) || null;
  // Only our own storage — a pasted outside link never becomes an <img>.
  const imageUrl = input.imageUrl ? toProxyUrl(input.imageUrl) : null;
  if (imageUrl && !imageUrl.startsWith("/storage/")) return { error: "Bilden kunde inte sparas" };
  const value = input.metricId ? parsePulseValue(input.value) : null;
  if (value !== null && !Number.isFinite(value)) return { error: "Skriv ett tal" };
  const metric = value !== null ? await prisma.impactMetric.findFirst({ where: { id: input.metricId, projectSlug: slug }, select: { id: true, label: true, unit: true } }) : null;
  if (value !== null && !metric) return { error: "Mätetalet hittades inte" };
  if (!note && !imageUrl && !metric) return { error: "Skriv en mening, lägg till ett foto eller en siffra" };

  await prisma.$transaction(async (tx) => {
    // The figure goes where every other figure goes: the metric's history.
    const update = metric
      ? await tx.impactUpdate.create({ data: { impactMetricId: metric.id, value: value!, note, updatedById: ctx.userId } })
      : null;
    if (metric) await tx.impactMetric.update({ where: { id: metric.id }, data: { currentValue: value! } });
    await tx.impactPulse.create({ data: { projectId: ctx.project.id, userId: ctx.userId, note, imageUrl, impactUpdateId: update?.id ?? null } });
  });
  await logActivity(ctx.project.id, ctx.userId, "impact_pulse", {
    description: note,
    ...(metric ? { title: `${metric.label}: ${value} ${metric.unit}` } : {}),
  });
  return done(slug);
}

export async function snoozePulse(slug: string): Promise<{ error?: string }> {
  const ctx = await requireMember(slug);
  if (!ctx) return { error: "Forbidden" };
  await prisma.impactPulse.create({ data: { projectId: ctx.project.id, userId: ctx.userId, snoozedUntil: snoozeUntil(Date.now()) } });
  return done(slug);
}
