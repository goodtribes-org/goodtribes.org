export default function ImpactStatsWidget({
  totalRaised,
  totalHours,
  completedTasks,
}: {
  totalRaised: number;
  totalHours: number;
  completedTasks: number;
}) {
  const formattedRaised = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(totalRaised);

  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-dark-slate mb-3">Vår påverkan</h2>

      <div className="bg-coral/10 rounded-xl px-4 py-3 text-center mb-2">
        <p className="text-3xl font-bold text-coral">{formattedRaised}</p>
        <p className="text-dark-slate/60 text-sm mt-0.5">Insamlat totalt</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-dry-sage/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-dark-slate">{totalHours.toLocaleString("sv-SE")}</p>
          <p className="text-dark-slate/60 text-xs mt-0.5">Volontärtimmar</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-dark-slate">{completedTasks.toLocaleString("sv-SE")}</p>
          <p className="text-dark-slate/60 text-xs mt-0.5">Avklarade uppgifter</p>
        </div>
      </div>
    </section>
  );
}
