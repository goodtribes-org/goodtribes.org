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
    <div className="bg-white rounded-2xl p-5 flex flex-col border border-muted-teal/40 shadow-sm">
      <p className="text-seagrass text-xs font-semibold uppercase tracking-widest mb-4">
        Where good ideas become reality
      </p>

      <div className="space-y-3 mb-4">
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

      <div className="space-y-2">
        {isLoggedIn ? (
          <Link
            href="/projects/new"
            className="block w-full text-center bg-coral text-white font-semibold px-4 py-3 rounded-xl hover:bg-watermelon transition-colors"
          >
            Starta ett projekt →
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center bg-coral text-white font-semibold px-4 py-3 rounded-xl hover:bg-watermelon transition-colors"
          >
            Kom igång gratis →
          </Link>
        )}
        <Link
          href="#projects"
          className="block w-full text-center bg-seagrass/10 text-dark-slate font-medium px-4 py-2.5 rounded-xl hover:bg-seagrass/20 transition-colors text-sm"
        >
          Utforska projekt
        </Link>
      </div>
    </div>
  );
}
