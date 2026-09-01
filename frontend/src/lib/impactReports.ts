import { prisma } from "@/lib/prisma";

// PRD 4d — an ImpactReport is a discrete, externally verified claim of
// achieved SDG outcome, deliberately separate from ImpactMetric/ImpactUpdate
// (self-reported, continuously updated progress counters). Only a verified
// report is shown publicly: an unreviewed claim is just a claim, and the
// whole point of the model is to be the thing a funder or partner can trust.

export type ImpactReportStatus = "pending" | "verified" | "rejected";

export function impactReportStatus(report: {
  verifiedAt: Date | null;
  rejectedAt: Date | null;
}): ImpactReportStatus {
  if (report.verifiedAt) return "verified";
  if (report.rejectedAt) return "rejected";
  return "pending";
}

// A report is awaiting review only while it has neither outcome — this is the
// filter the site-admin queue and the "pending" badges both use, kept in one
// place so they can never drift apart.
export const PENDING_REPORT_WHERE = {
  verifiedAt: null,
  rejectedAt: null,
} as const;

// Evidence URLs are free-text user input rendered as an anchor. Anything that
// isn't plain http(s) — `javascript:`, `data:`, a relative path that would
// resolve against goodtribes.org — is dropped rather than linked.
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getVerifiedImpactReports(projectId: string) {
  return prisma.impactReport.findMany({
    where: { projectId, verifiedAt: { not: null } },
    orderBy: { verifiedAt: "desc" },
    include: { verifiedBy: { select: { name: true } } },
  });
}

export async function countPendingImpactReports(): Promise<number> {
  return prisma.impactReport.count({ where: PENDING_REPORT_WHERE });
}

// The union of every SDG goal this project has actually had verified — the
// honest version of Project.sdgGoals, which is only ever self-declared.
export function verifiedSdgGoals(reports: { sdgGoals: number[] }[]): number[] {
  return [...new Set(reports.flatMap((r) => r.sdgGoals))].sort((a, b) => a - b);
}
