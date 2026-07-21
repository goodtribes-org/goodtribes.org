import type { NetworkStats } from "@/lib/networkStats";
import CountryMap from "@/components/CountryMap";
import { countByCountry } from "@/lib/geo";
import NetworkInsightsButton from "./NetworkInsightsButton";

export default function NetworkDashboard({
  stats,
  parentSlug,
  isOwnerOrAdmin,
}: {
  stats: NetworkStats;
  parentSlug: string;
  isOwnerOrAdmin: boolean;
}) {
  const countryCounts = countByCountry(stats.instances.map((i) => i.country));

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">Nätverksöversikt</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dry-sage/30 rounded-xl px-4 py-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-seagrass">{stats.totalContributors}</p>
          <p className="text-xs text-dark-slate/50 mt-0.5">Bidragsgivare</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-seagrass">{Math.round(stats.totalTokens)}</p>
          <p className="text-xs text-dark-slate/50 mt-0.5">Tribe Tokens</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-seagrass">{stats.totalTasksDone}</p>
          <p className="text-xs text-dark-slate/50 mt-0.5">Avklarade uppgifter</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-seagrass">{stats.totalFundsRaised.toLocaleString("sv-SE")}</p>
          <p className="text-xs text-dark-slate/50 mt-0.5">Insamlat (alla valutor)</p>
        </div>
      </div>

      <div className="mb-4">
        <CountryMap counts={countryCounts} unitLabel="instanser" />
      </div>

      {isOwnerOrAdmin && <NetworkInsightsButton parentSlug={parentSlug} />}

      <div className="overflow-x-auto border border-muted-teal/30 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dry-sage/30 text-left text-xs text-dark-slate/50 uppercase tracking-wider">
              <th className="px-3 py-2 font-semibold">Instans</th>
              <th className="px-3 py-2 font-semibold">Plats</th>
              <th className="px-3 py-2 font-semibold text-right">Bidragsgivare</th>
              <th className="px-3 py-2 font-semibold text-right">Tokens</th>
              <th className="px-3 py-2 font-semibold text-right">Uppgifter</th>
              <th className="px-3 py-2 font-semibold text-right">Insamlat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-teal/20">
            {stats.instances.map((inst) => (
              <tr key={inst.slug}>
                <td className="px-3 py-2 font-medium text-dark-slate">{inst.title}</td>
                <td className="px-3 py-2 text-dark-slate/50">
                  {inst.region ? `${inst.region}${inst.country ? `, ${inst.country}` : ""}` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-dark-slate">{inst.contributors}</td>
                <td className="px-3 py-2 text-right text-dark-slate">{Math.round(inst.tokens)}</td>
                <td className="px-3 py-2 text-right text-dark-slate">{inst.tasksDone}</td>
                <td className="px-3 py-2 text-right text-dark-slate">{inst.fundsRaised.toLocaleString("sv-SE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
