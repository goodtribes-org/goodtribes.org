import Link from "next/link";

export default function HomeStatsWidget({
  projectCount,
  orgCount,
  memberCount,
  isLoggedIn,
}: {
  projectCount: number;
  orgCount: number;
  memberCount: number;
  isLoggedIn: boolean;
}) {
  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">Statistik</h2>
        <Link href="#projects" className="text-xs text-seagrass hover:underline">
          Utforska projekt →
        </Link>
      </div>

      <div className="space-y-2 mb-4">
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{projectCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">Aktiva projekt</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{orgCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">Organisationer</p>
        </div>
        <div className="bg-dry-sage/20 rounded-xl px-4 py-3 text-center">
          <p className="text-3xl font-bold text-dark-slate">{memberCount}</p>
          <p className="text-dark-slate/60 text-sm mt-0.5">Volontärer</p>
        </div>
      </div>

      <Link
        href={isLoggedIn ? "/projects/new" : "/login"}
        className="block w-full text-center px-4 py-2.5 bg-coral text-white rounded-xl font-semibold text-sm hover:bg-coral/90 transition-colors"
      >
        {isLoggedIn ? "Starta ett projekt →" : "Kom igång gratis →"}
      </Link>
    </section>
  );
}
