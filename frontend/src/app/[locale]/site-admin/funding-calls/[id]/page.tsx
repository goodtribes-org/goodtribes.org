import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { isAiEnabled } from "@/lib/anthropic";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { Provenance } from "@/lib/fundingCalls/types";
import CallEditor from "./CallEditor";

const timeFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const toLocal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

// One call: the source's own words on the left (read-only, refreshed by
// every import), our fields to check and correct, each with the quote it
// came from. Publishing needs a summary, a link and a deadline.
export default async function FundingCallAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const call = await prisma.fundingCall.findUnique({ where: { id }, include: { fundingSource: { select: { name: true, adapter: true } } } });
  if (!call) notFound();
  const aiAvailable = isAiEnabled() && (await isFeatureEnabled("funding-calls-ai", session?.user?.id));
  const sourceText = (label: string, value: string | null) =>
    value ? (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{label}</p>
        <p className="whitespace-pre-line text-sm text-dark-slate/80">{value}</p>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/site-admin/funding-calls" className="text-sm text-dark-slate/60 hover:text-dark-slate">← Utlysningar</Link>
      <div className="mt-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">
          {call.fundingSource.name} · {call.status === "PUBLISHED" ? "Publicerad" : call.status === "CLOSED" ? "Stängd" : "Utkast"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-dark-slate">{call.title}</h1>
        {call.changedAt && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Källan ändrade utlysningen {timeFmt.format(call.changedAt)}. Kontrollera deadline och texterna nedan.
          </p>
        )}
      </div>

      {(call.sourceDescription || call.eligibilityText || call.amountText || call.externalId) && (
        <section className="mb-8 flex flex-col gap-3 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4">
          <h2 className="text-sm font-semibold text-dark-slate">Från källan {call.externalId && <span className="font-normal text-dark-slate/50">· {call.externalId}</span>}</h2>
          {sourceText("Beskrivning", call.sourceDescription)}
          {sourceText("Vem kan söka", call.eligibilityText)}
          {sourceText("Belopp", call.amountText)}
          {call.fetchedAt && <p className="text-xs text-dark-slate/50">Senast hämtad {timeFmt.format(call.fetchedAt)}</p>}
        </section>
      )}

      {/* Rebuilt when the call changes (a save, an AI suggestion), so the form shows what's stored. */}
      <CallEditor
        key={call.updatedAt.toISOString()}
        id={call.id}
        status={call.status}
        changed={!!call.changedAt}
        aiAvailable={aiAvailable}
        provenance={(call.provenance as Provenance | null) ?? {}}
        initial={{
          title: call.title,
          imageUrl: call.imageUrl ?? "",
          url: call.url ?? "",
          applyUrl: call.applyUrl ?? "",
          deadline: toLocal(call.deadline),
          rolling: call.rolling,
          summary: call.summary ?? "",
          applicantTypes: call.applicantTypes,
          amountMinSek: call.amountMinSek?.toString() ?? "",
          amountMaxSek: call.amountMaxSek?.toString() ?? "",
          totalBudgetSek: call.totalBudgetSek?.toString() ?? "",
          cofunding: call.cofunding ?? "",
          projectStart: call.projectStart ? call.projectStart.toISOString().slice(0, 10) : "",
          projectLengthMonths: call.projectLengthMonths?.toString() ?? "",
          sdgGoals: call.sdgGoals,
          tags: call.tags.join(", "),
          requirements: call.requirements.join("\n"),
          stateAidRule: call.stateAidRule ?? "",
        }}
      />
    </div>
  );
}
