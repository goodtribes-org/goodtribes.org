import { SdgIcon } from "@/components/SdgIcon";

const ALL_GOALS = Array.from({ length: 17 }, (_, i) => i + 1);

export default function SdgCoverageWidget({ coveredGoals }: { coveredGoals: number[] }) {
  const covered = new Set(coveredGoals);

  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">Agenda 2030</h2>
        <span className="text-xs text-dark-slate/50">{covered.size} av 17 mål</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {ALL_GOALS.map((n) => (
          <div key={n} className={covered.has(n) ? "" : "opacity-20"} title={covered.has(n) ? undefined : "Inget projekt ännu"}>
            <SdgIcon n={n} size={32} />
          </div>
        ))}
      </div>
    </section>
  );
}
