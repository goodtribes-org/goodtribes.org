"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startApplication, dismissMatch } from "./actions";
import type { FundingMatch, FundingSource } from "@prisma/client";

type MatchWithSource = FundingMatch & { fundingSource: FundingSource };

export default function MatchList({
  matches,
  projectSlug,
  canManage,
}: {
  matches: MatchWithSource[];
  projectSlug: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <div key={m.id} className="border border-seagrass/30 bg-seagrass/5 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-dark-slate">{m.fundingSource.name}</p>
              <p className="text-xs text-dark-slate/50 mt-0.5">
                {m.fundingSource.organization ?? ""}
                {(m.fundingSource.minAmountSek || m.fundingSource.maxAmountSek) &&
                  ` · ${m.fundingSource.minAmountSek ?? "?"}–${m.fundingSource.maxAmountSek ?? "?"} kr`}
                {m.fundingSource.nextDeadline && ` · Deadline ${new Date(m.fundingSource.nextDeadline).toLocaleDateString("sv-SE")}`}
              </p>
              {m.fundingSource.description && (
                <p className="text-sm text-dark-slate/60 mt-1">{m.fundingSource.description}</p>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  await startApplication(projectSlug, m.fundingSourceId);
                  router.refresh();
                })}
                className="text-xs font-medium bg-coral text-white px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Starta ansökan
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  await dismissMatch(m.id, projectSlug);
                  router.refresh();
                })}
                className="text-xs font-medium text-dark-slate/40 hover:text-dark-slate transition-colors disabled:opacity-50"
              >
                Dölj
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
