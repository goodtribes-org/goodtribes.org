import { prisma } from "@/lib/prisma";
import type { ImpactReportKind, ImpactValueQualifier } from "@prisma/client";

export type { ImpactReportKind, ImpactValueQualifier };

export const IMPACT_REPORT_KINDS: ImpactReportKind[] = ["DELIVERED", "SUPPORT_RECEIVED"];
export const IMPACT_VALUE_QUALIFIERS: ImpactValueQualifier[] = [
  "EXACT",
  "AT_LEAST",
  "APPROXIMATE",
];

export function isImpactReportKind(value: unknown): value is ImpactReportKind {
  return typeof value === "string" && (IMPACT_REPORT_KINDS as string[]).includes(value);
}

export function isImpactValueQualifier(value: unknown): value is ImpactValueQualifier {
  return typeof value === "string" && (IMPACT_VALUE_QUALIFIERS as string[]).includes(value);
}

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

// The homepage founding-story section (FoundingStory.tsx). Returns null when
// the configured project doesn't exist or is hidden, so the section can hide
// itself entirely rather than render a heading over a dead link — the INFOS
// project is seeded data, not something the schema guarantees is present in
// any given environment.
export async function getFoundingStoryData(slug: string, limit = 3) {
  const project = await prisma.project.findFirst({
    where: { slug, hiddenAt: null },
    select: { id: true, slug: true, title: true },
  });
  if (!project) return null;

  const reports = await prisma.impactReport.findMany({
    where: { projectId: project.id, verifiedAt: { not: null }, kind: "DELIVERED" },
    // Cumulative totals first — they're the headline "since inception"
    // figures, and a period figure shown above its own total reads oddly.
    // Then creation order, with id as a final tiebreak so the homepage can't
    // silently reshuffle between requests. Deliberately NOT ordered by
    // metricValue: ranking 50 000 000 kr above 25 000 datorenheter compares
    // two different units and would bury whichever figure happens to use the
    // smaller-numbered one.
    orderBy: [{ isCumulative: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });

  return { project, reports };
}

export async function countPendingImpactReports(): Promise<number> {
  return prisma.impactReport.count({ where: PENDING_REPORT_WHERE });
}

// The union of every SDG goal this project has actually had verified — the
// honest version of Project.sdgGoals, which is only ever self-declared.
export function verifiedSdgGoals(reports: { sdgGoals: number[] }[]): number[] {
  return [...new Set(reports.flatMap((r) => r.sdgGoals))].sort((a, b) => a - b);
}

// Delivered impact and the support that paid for it are both worth showing,
// but never in the same list: "50 000 000 kr donerad utrustning" and
// "1 658 000 kr i kommunalt stöd" are not two achievements of the same kind,
// and a reader scanning a single column of green numbers would read them as
// if they were.
export function groupReportsByKind<T extends { kind: ImpactReportKind }>(reports: T[]) {
  return {
    delivered: reports.filter((r) => r.kind === "DELIVERED"),
    supportReceived: reports.filter((r) => r.kind === "SUPPORT_RECEIVED"),
  };
}

// Deliberately no sum() helper anywhere in this module. A cumulative
// "total sedan start" report overlaps the per-period reports for the same
// programme rather than adding to them (INFOS: 25 000 datorenheter totalt
// *includes* the 16 100 from 2005-2008), so any total this app computed
// itself would silently double-count. Figures are shown as reported, each
// with its own period and cumulative flag, and the reader does the arithmetic
// they actually want.
