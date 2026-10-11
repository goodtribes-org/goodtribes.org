import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { gdpKey } from "@/lib/fundingCalls/gdp";
import { ImportNow, NewManualCall, SourceAdapter } from "./SourceControls";

const dateFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Utlysningar (#343): the import's sources and every call it has found.
// Drafts wait for an admin to check the fields and publish; a published
// call the source has changed is marked until someone has looked.
export default async function FundingCallsAdminPage() {
  const now = new Date();
  const [sources, drafts, published, closed] = await Promise.all([
    prisma.fundingSource.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, adapter: true, lastFetchedAt: true, _count: { select: { calls: true } } } }),
    prisma.fundingCall.findMany({
      where: { status: "DRAFT", OR: [{ rolling: true }, { deadline: null }, { deadline: { gt: now } }] },
      orderBy: [{ deadline: { sort: "asc", nulls: "last" } }],
      include: { fundingSource: { select: { name: true } } },
    }),
    prisma.fundingCall.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ deadline: { sort: "asc", nulls: "last" } }], include: { fundingSource: { select: { name: true } } } }),
    prisma.fundingCall.findMany({ where: { status: "CLOSED" }, orderBy: { deadline: "desc" }, take: 15, include: { fundingSource: { select: { name: true } } } }),
  ]);

  const row = (c: (typeof drafts)[number]) => (
    <li key={c.id}>
      <Link href={`/site-admin/funding-calls/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-muted-teal/30 bg-white px-4 py-3 hover:border-seagrass">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-dark-slate">{c.title}</span>
          <span className="text-xs text-dark-slate/55">
            {c.fundingSource.name}
            {c.summary ? "" : " · saknar sammanfattning"}
            {c.aiSuggestedAt ? " · AI-förslag" : ""}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs">
          {c.changedAt && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Ändrad hos källan</span>}
          <span className="text-dark-slate/60">{c.rolling ? "Löpande" : c.deadline ? `Stänger ${dateFmt.format(c.deadline)}` : "Ingen deadline"}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Utlysningar</h1>
        <p className="mt-1 text-sm text-dark-slate/60">
          Hämtas automatiskt från finansiärernas egna dataflöden. Inget syns publikt förrän du har kontrollerat fälten och publicerat.
          Finansiärerna läggs upp i <Link href="/site-admin/funding-sources" className="font-semibold text-seagrass hover:underline">Fondkatalogen</Link>.
        </p>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Källor</h2>
          <ImportNow />
        </div>
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-muted-teal/30 bg-white px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-dark-slate">{s.name}</span>
                <span className="ml-2 text-xs text-dark-slate/50">
                  {s._count.calls} utlysningar
                  {s.lastFetchedAt ? ` · hämtad ${timeFmt.format(s.lastFetchedAt)}` : ""}
                  {s.adapter === "GDP_FORMAS" && !gdpKey("GDP_FORMAS") ? " · API-nyckel saknas (FORMAS_GDP_API_KEY)" : ""}
                </span>
              </span>
              <SourceAdapter sourceId={s.id} adapter={s.adapter} />
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <NewManualCall sources={sources.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Att kontrollera ({drafts.length + published.filter((c) => c.changedAt).length})</h2>
        {drafts.length === 0 && !published.some((c) => c.changedAt) ? (
          <p className="text-sm text-dark-slate/40">Inget väntar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {published.filter((c) => c.changedAt).map(row)}
            {drafts.map(row)}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Publicerade ({published.length})</h2>
        {published.length === 0 ? <p className="text-sm text-dark-slate/40">Inga än.</p> : <ul className="flex flex-col gap-2">{published.map(row)}</ul>}
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dark-slate/60">Senast stängda</h2>
          <ul className="flex flex-col gap-2 opacity-70">{closed.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
