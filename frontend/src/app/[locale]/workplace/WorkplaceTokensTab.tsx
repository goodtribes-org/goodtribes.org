import Link from "next/link";
import { relativeTime, type T } from "./workplaceHelpers";

type TokensByProjectRow = { projectSlug: string; projectTitle: string; tokens: number };

type RecentTokenActivityRow = {
  id: string;
  reason: string;
  tokens: number;
  createdAt: Date;
  projectSlug: string;
  projectTitle: string;
};

export default function WorkplaceTokensTab({
  t,
  totalTokens,
  tokensByProject,
  recentTokenActivity,
}: {
  t: T;
  totalTokens: number;
  tokensByProject: TokensByProjectRow[];
  recentTokenActivity: RecentTokenActivityRow[];
}) {
  return (
    <div className="space-y-10">
      {/* Total tokens */}
      <section>
        <div className="border border-muted-teal rounded-lg p-8 flex flex-col items-center gap-2 text-center">
          <span className="text-5xl font-bold text-seagrass">
            {totalTokens % 1 === 0 ? totalTokens.toFixed(0) : totalTokens.toFixed(1)}
          </span>
          <span className="text-lg font-semibold text-dark-slate">{t("tribeTokensLabel")}</span>
          <span className="text-sm text-dark-slate/50">{t("totalEarned")}</span>
        </div>
      </section>

      {/* Per-project breakdown */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("perProjectHeading")}</h2>
        {tokensByProject.length === 0 ? (
          <p className="text-dark-slate/50 italic text-sm">
            {t("noTokensYet")}
          </p>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {tokensByProject.map((row) => (
              <Link
                key={row.projectSlug}
                href={`/projects/${row.projectSlug}/tokens`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-dry-sage/20 transition-colors"
              >
                <span className="flex-1 text-sm text-dark-slate">{row.projectTitle}</span>
                <span className="text-sm font-bold text-seagrass flex-shrink-0">
                  {row.tokens % 1 === 0 ? row.tokens.toFixed(0) : row.tokens.toFixed(1)}{" "}
                  <span className="font-normal text-dark-slate/50">{t("tokensUnit")}</span>
                </span>
                <span className="text-xs text-dark-slate/40 flex-shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t("recentTokenActivityHeading")}</h2>
        {recentTokenActivity.length === 0 ? (
          <p className="text-dark-slate/50 italic text-sm">{t("noActivityYet")}</p>
        ) : (
          <div className="border border-muted-teal rounded-lg overflow-hidden divide-y divide-muted-teal/50">
            {recentTokenActivity.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-lg flex-shrink-0 w-7 text-center" aria-hidden="true">
                  🪙
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-slate truncate">{entry.reason}</p>
                  <p className="text-xs text-dark-slate/40">{entry.projectTitle}</p>
                </div>
                <span className="text-sm font-bold text-seagrass flex-shrink-0">
                  +{entry.tokens % 1 === 0 ? entry.tokens.toFixed(0) : entry.tokens.toFixed(1)}
                </span>
                <span className="text-xs text-dark-slate/40 flex-shrink-0">
                  {relativeTime(t, entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
