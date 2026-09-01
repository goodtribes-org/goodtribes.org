"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import {
  PENDING_REPORT_WHERE,
  isImpactReportKind,
  isImpactValueQualifier,
  safeExternalUrl,
} from "@/lib/impactReports";


// Returns the project id so callers that need it (impact reports) don't have
// to re-fetch the project they just authorized against.
async function assertOwnerOrAdmin(projectSlug: string, userId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: { id: true },
  });
  if (!project || !(await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES))) {
    redirect(`/projects/${projectSlug}/impact`);
  }
  return project.id;
}

export async function addImpactMetric(projectSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertOwnerOrAdmin(projectSlug, session.user.id);

  const label = (formData.get("label") as string).trim();
  const unit = (formData.get("unit") as string).trim();
  const targetRaw = formData.get("targetValue") as string | null;
  const targetValue = targetRaw && targetRaw.trim() !== "" ? parseFloat(targetRaw) : null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!label || !unit) return;

  await prisma.impactMetric.create({
    data: {
      projectSlug,
      label,
      unit,
      targetValue: targetValue ?? undefined,
      description,
    },
  });

  revalidatePath(`/projects/${projectSlug}/impact`);
}

export async function updateImpactMetric(
  metricId: string,
  projectSlug: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertOwnerOrAdmin(projectSlug, session.user.id);

  const valueRaw = formData.get("value") as string;
  const note = (formData.get("note") as string | null)?.trim() || null;
  const value = parseFloat(valueRaw);

  if (isNaN(value)) return;

  await prisma.$transaction([
    prisma.impactUpdate.create({
      data: {
        impactMetricId: metricId,
        value,
        note,
        updatedById: session.user.id,
      },
    }),
    prisma.impactMetric.update({
      where: { id: metricId },
      data: { currentValue: value },
    }),
  ]);

  revalidatePath(`/projects/${projectSlug}/impact`);
}

// ---------------------------------------------------------------------------
// Impact reports (PRD 4d) — a discrete, reviewable claim of achieved SDG
// outcome, submitted by the project and verified by the Foundation. Separate
// from the metrics above, which stay self-reported by design.
// ---------------------------------------------------------------------------

export async function createImpactReport(projectSlug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const projectId = await assertOwnerOrAdmin(projectSlug, session.user.id);

  const metricDescription = ((formData.get("metricDescription") as string) ?? "").trim();
  const metricValue = parseFloat((formData.get("metricValue") as string) ?? "");
  const metricUnit = ((formData.get("metricUnit") as string | null) ?? "").trim() || null;
  const evidenceUrl = safeExternalUrl(formData.get("evidenceUrl") as string | null);
  const sourceName = ((formData.get("sourceName") as string | null) ?? "").trim() || null;
  const isCumulative = formData.get("isCumulative") === "on";

  // Unknown values fall back to the pre-existing meaning of a report
  // (a delivered, exact figure) rather than being rejected — the same
  // defaults the migration gave every existing row.
  const rawKind = formData.get("kind");
  const kind = isImpactReportKind(rawKind) ? rawKind : "DELIVERED";
  const rawQualifier = formData.get("valueQualifier");
  const valueQualifier = isImpactValueQualifier(rawQualifier) ? rawQualifier : "EXACT";

  // Only real SDG numbers (1-17) are accepted — the form sends checkbox
  // values, but a hand-crafted POST could send anything.
  const sdgGoals = [
    ...new Set(
      formData
        .getAll("sdgGoals")
        .map((v) => parseInt(String(v), 10))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 17)
    ),
  ].sort((a, b) => a - b);

  const periodStart = parseDateInput(formData.get("periodStart"));
  const periodEnd = parseDateInput(formData.get("periodEnd"));

  if (!metricDescription || !Number.isFinite(metricValue) || sdgGoals.length === 0) return;
  if (periodStart && periodEnd && periodEnd < periodStart) return;

  await prisma.impactReport.create({
    data: {
      projectId,
      sdgGoals,
      metricDescription,
      metricValue,
      metricUnit,
      kind,
      valueQualifier,
      isCumulative,
      sourceName,
      evidenceUrl,
      periodStart,
      periodEnd,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/projects/${projectSlug}/impact`);
  revalidatePath("/site-admin/impact-reports");
}

// Withdrawing a submission is only allowed while it's still pending — once
// the Foundation has verified or rejected it, the row is a decision record
// and the project can't delete it out from under the reviewer.
export async function deleteImpactReport(projectSlug: string, reportId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const projectId = await assertOwnerOrAdmin(projectSlug, session.user.id);

  await prisma.impactReport.deleteMany({
    where: { id: reportId, projectId, ...PENDING_REPORT_WHERE },
  });

  revalidatePath(`/projects/${projectSlug}/impact`);
  revalidatePath("/site-admin/impact-reports");
}

function parseDateInput(raw: FormDataEntryValue | null): Date | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}
