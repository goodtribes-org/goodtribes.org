import { Link } from "@/i18n/navigation";
import { getMetrics, type FunnelRow } from "@/lib/funnelMetrics";

export const dynamic = "force-dynamic";

const fmtWeek = (d: Date) => d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", timeZone: "UTC" });
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");

const STEPS: { key: keyof Omit<FunnelRow, "week">; label: string }[] = [
  { key: "accounts", label: "Konto" },
  { key: "dreamed", label: "Skrivit en dröm" },
  { key: "openedTask", label: "Öppnat en första uppgift" },
  { key: "helped", label: "Hjälpt någon annan" },
  { key: "active30", label: "Aktiv efter 30 dagar" },
];

// The funnel and the North Star (#292): are visitors becoming medskapare,
// and are projects coming alive? Counted from the database, nothing tracked
// in the browser.
export default async function MetricsPage() {
  const { weeks, funnel, northStar, events } = await getMetrics();
  const now = northStar[northStar.length - 1];
  const before = northStar[northStar.length - 2];
  const max = Math.max(1, ...northStar);

  // Cohorts don't overlap, so the eight weeks add up. "Aktiv efter 30
  // dagar" only over the weeks where it can be known yet.
  const known = funnel.filter((r) => r.active30 !== null);
  const total = {
    accounts: funnel.reduce((s, r) => s + r.accounts, 0),
    dreamed: funnel.reduce((s, r) => s + r.dreamed, 0),
    openedTask: funnel.reduce((s, r) => s + r.openedTask, 0),
    helped: funnel.reduce((s, r) => s + r.helped, 0),
  };
  const knownAccounts = known.reduce((s, r) => s + r.accounts, 0);
  const knownActive = known.reduce((s, r) => s + (r.active30 ?? 0), 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Tratt och North Star</h1>
        <p className="mt-1 text-sm text-dark-slate/60">
          Blir besökare medskapare, och får projekten liv? Räknat ur databasen, de senaste {weeks.length} veckorna (måndag–söndag, UTC). GoodTribes AI-användare räknas inte.
        </p>
      </div>

      <section className="rounded-xl border border-muted-teal/30 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">North Star</h2>
        <p className="mt-1 text-sm text-dark-slate/70">Publicerade projekt där minst två personer var aktiva under veckan (aktivitetsloggen, projektchatten, anmälningar till första uppgifter).</p>
        <div className="mt-4 flex items-end gap-6">
          <div>
            <p className="text-5xl font-bold text-coral">{now}</p>
            <p className="text-xs text-dark-slate/60">den här veckan · förra veckan {before}</p>
          </div>
          <div className="flex h-24 flex-1 items-end gap-2" aria-label="North Star per vecka">
            {northStar.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-dark-slate/70">{n}</span>
                <div className={`w-full rounded-t ${i === northStar.length - 1 ? "bg-coral" : "bg-dark-slate/25"}`} style={{ height: `${Math.max(4, (n / max) * 64)}px` }} />
                <span className="text-[10px] text-dark-slate/50">{fmtWeek(weeks[i])}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-muted-teal/30 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Tratten</h2>
        <p className="mt-1 text-sm text-dark-slate/70">
          Per vecka man skapade sitt konto: hur många som sedan har tagit varje steg. Procent av kontona samma vecka. &quot;Aktiv efter 30 dagar&quot; = något gjort i ett projekt dag 30–60, och syns först när veckan är 60 dagar gammal.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-dark-slate/50">
                <th className="py-2 pr-3 font-medium">Vecka</th>
                {STEPS.map((s) => <th key={s.key} className="py-2 pr-3 font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...funnel].reverse().map((r) => (
                <tr key={r.week.toISOString()} className="border-t border-muted-teal/20">
                  <td className="py-2 pr-3 text-dark-slate/70">{fmtWeek(r.week)}</td>
                  {STEPS.map((s) => {
                    const v = r[s.key] as number | null;
                    return (
                      <td key={s.key} className="py-2 pr-3">
                        {v === null ? <span className="text-dark-slate/30">ännu inte</span> : (
                          <>
                            <span className="font-semibold text-dark-slate">{v}</span>
                            {s.key !== "accounts" && <span className="ml-1 text-xs text-dark-slate/50">{pct(v, r.accounts)}</span>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-dark-slate/20 font-semibold">
                <td className="py-2 pr-3 text-dark-slate">Totalt</td>
                <td className="py-2 pr-3 text-dark-slate">{total.accounts}</td>
                {(["dreamed", "openedTask", "helped"] as const).map((k) => (
                  <td key={k} className="py-2 pr-3 text-dark-slate">{total[k]}<span className="ml-1 text-xs font-normal text-dark-slate/50">{pct(total[k], total.accounts)}</span></td>
                ))}
                <td className="py-2 pr-3 text-dark-slate">
                  {known.length ? <>{knownActive}<span className="ml-1 text-xs font-normal text-dark-slate/50">{pct(knownActive, knownAccounts)}</span></> : <span className="font-normal text-dark-slate/30">ännu inte</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-muted-teal/30 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/50">Event</h2>
        {events.length ? (
          <ul className="mt-3 space-y-3">
            {events.map((e) => (
              <li key={e.code} className="flex flex-wrap items-center justify-between gap-3 border-t border-muted-teal/20 pt-3 first:border-0 first:pt-0">
                <div>
                  <p className="font-semibold text-dark-slate">{e.title}</p>
                  <p className="text-xs text-dark-slate/60">
                    /e/{e.code}
                    {e.startsAt && ` · ${e.startsAt.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" })}`}
                    {" · "}<Link href={`/e/${e.code}/skarm`} className="underline">storskärmen</Link>
                  </p>
                </div>
                <p className="text-sm text-dark-slate/80">
                  <b>{e.people}</b> deltagare · <b>{e.dreams}</b> drömmar · <b>{e.firstTasks}</b> öppnade uppgifter · <b>{e.helped}</b> hjälpte någon
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-dark-slate/60">Inga event än. Lägg upp ett under <Link href="/site-admin/events" className="underline">Event</Link>.</p>
        )}
      </section>
    </div>
  );
}
