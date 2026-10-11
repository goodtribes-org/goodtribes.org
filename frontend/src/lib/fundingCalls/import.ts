import { createHash } from "node:crypto";
import type { FundingCallAdapter, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { shortQuote, stockholmLabel, type Provenance, type RawCall } from "./types";
import { fetchVinnovaCalls } from "./vinnova";
import { fetchGdpCalls, GDP_FUNDERS, type GdpAdapter } from "./gdp";
import { notifyDeadlineChanged } from "./reminders";

// Utlysningar (#343): fetch new and changed calls from every active source
// that has an adapter. Run daily by the cron route, or by a site admin's
// "Hämta nu". Never publishes anything: a new call is a DRAFT until an admin
// has checked it. Each source is isolated — one failing doesn't stop the rest.

const DAY = 24 * 60 * 60 * 1000;
// First run looks back a year; later runs from the last fetch, with margin.
const FIRST_LOOKBACK_DAYS = 365;
const OVERLAP_DAYS = 2;

// The source-owned fields an import may refresh. Our own fields (summary,
// applicantTypes, amounts, …) are never in here.
const SOURCE_FIELDS = ["title", "url", "applyUrl", "sourceDescription", "eligibilityText", "amountText", "opensAt", "deadline", "totalBudgetSek"] as const;

export function callHash(c: RawCall): string {
  const plain = SOURCE_FIELDS.map((k) => {
    const v = c[k];
    return v instanceof Date ? v.toISOString() : v ?? null;
  });
  return createHash("sha256").update(JSON.stringify(plain)).digest("hex");
}

export function sourceProvenance(c: RawCall): Provenance {
  const p: Provenance = {};
  for (const k of ["sourceDescription", "eligibilityText", "amountText"] as const) {
    const quote = shortQuote(c[k]);
    if (quote) p[k] = { quote, url: c.url };
  }
  if (c.deadline) p.deadline = { quote: stockholmLabel(c.deadline), url: c.url };
  return p;
}

async function fetchFor(adapter: FundingCallAdapter, lastFetchedAt: Date | null, now: number): Promise<RawCall[] | null> {
  if (adapter === "VINNOVA") {
    const since = lastFetchedAt ? new Date(lastFetchedAt.getTime() - OVERLAP_DAYS * DAY) : new Date(now - FIRST_LOOKBACK_DAYS * DAY);
    return fetchVinnovaCalls(since, now);
  }
  if (adapter in GDP_FUNDERS) return fetchGdpCalls(adapter as GdpAdapter, now);
  return null;
}

export type SourceResult = { source: string; created: number; updated: number; skipped?: string; error?: string };

export async function importFundingCalls({ now = Date.now(), sourceId }: { now?: number; sourceId?: string } = {}): Promise<{ sources: SourceResult[]; closed: number }> {
  const sources = await prisma.fundingSource.findMany({
    where: { status: "ACTIVE", adapter: { not: "MANUAL" }, ...(sourceId ? { id: sourceId } : {}) },
    select: { id: true, name: true, adapter: true, lastFetchedAt: true },
  });
  const results: SourceResult[] = [];
  for (const source of sources) {
    const result: SourceResult = { source: source.name, created: 0, updated: 0 };
    try {
      const raws = await fetchFor(source.adapter, source.lastFetchedAt, now);
      if (raws === null) {
        result.skipped = "Ingen API-nyckel";
        results.push(result);
        continue;
      }
      for (const raw of raws) {
        const hash = callHash(raw);
        const existing = await prisma.fundingCall.findUnique({
          where: { fundingSourceId_externalId: { fundingSourceId: source.id, externalId: raw.externalId } },
          select: { id: true, contentHash: true, status: true, provenance: true, deadline: true },
        });
        const data = Object.fromEntries(SOURCE_FIELDS.map((k) => [k, raw[k]])) as Pick<RawCall, (typeof SOURCE_FIELDS)[number]>;
        if (!existing) {
          await prisma.fundingCall.create({
            data: { ...data, fundingSourceId: source.id, externalId: raw.externalId, contentHash: hash, fetchedAt: new Date(now), provenance: sourceProvenance(raw) as Prisma.InputJsonValue },
          });
          result.created++;
        } else if (existing.contentHash !== hash) {
          const provenance = { ...((existing.provenance as Provenance | null) ?? {}), ...sourceProvenance(raw) };
          await prisma.fundingCall.update({
            where: { id: existing.id },
            data: {
              ...data,
              contentHash: hash,
              fetchedAt: new Date(now),
              provenance: provenance as Prisma.InputJsonValue,
              // A published call changed at the source: the admin page and
              // (from #345) the projects working on it are told.
              ...(existing.status === "PUBLISHED" ? { changedAt: new Date(now) } : {}),
            },
          });
          result.updated++;
          // A new deadline on a published call: its application projects are told (#345).
          if (existing.status === "PUBLISHED" && (existing.deadline?.getTime() ?? null) !== (raw.deadline?.getTime() ?? null)) {
            await notifyDeadlineChanged(existing.id, raw.title, raw.deadline).catch((err) => logger.error("funding-calls deadline notice failed", { id: existing.id, err: String(err) }));
          }
        }
      }
      await prisma.fundingSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date(now) } });
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      logger.error("funding-calls import failed", { source: source.name, err: result.error });
    }
    results.push(result);
  }
  // Past their deadline: closed, whatever the source says.
  const { count: closed } = await prisma.fundingCall.updateMany({
    where: { status: { not: "CLOSED" }, rolling: false, deadline: { lt: new Date(now) } },
    data: { status: "CLOSED" },
  });
  logger.info("funding-calls import", { sources: results, closed });
  return { sources: results, closed };
}
