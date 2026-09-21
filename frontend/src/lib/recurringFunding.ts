import { prisma } from "@/lib/prisma";
import type { RecurringFundingSource, RecurringFundingInterval } from "@prisma/client";

export async function getActiveRecurringFundingSources(projectId: string): Promise<RecurringFundingSource[]> {
  return prisma.recurringFundingSource.findMany({
    where: { projectId, endedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

// Same caution as impactReports.ts's deliberate lack of a sum/total helper:
// summing MONTHLY against ANNUALLY would silently misrepresent the total,
// so this only ever sums rows that share an identical interval. No
// cross-interval normalization, no ratio against budget/costs, no single
// "self-sufficiency score" -- the reader does that arithmetic, if any.
export function sumByInterval(
  sources: RecurringFundingSource[]
): Partial<Record<RecurringFundingInterval, number>> {
  const totals: Partial<Record<RecurringFundingInterval, number>> = {};
  for (const source of sources) {
    totals[source.interval] = (totals[source.interval] ?? 0) + source.amountSek;
  }
  return totals;
}
