"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { markSubmitted, recordOutcome, requestReview, saveCallApplication } from "./actions";

export type CallApplication = {
  id: string;
  status: string;
  call: { slug: string | null; title: string; requirements: string[]; applyUrl: string | null; url: string | null; deadline: string | null };
  entityId: string | null;
  entityKind: string | null;
  entityName: string | null;
  requirementsDone: string[];
  amountRequestedSek: number | null;
  cofunding: string | null;
  cofundingNote: string | null;
  reviewBy: string | null;
  submittedAt: string | null;
  outcomeAmountSek: number | null;
  outcomeNote: string | null;
  findings: string[];
  decision: { result: string; motivation: string | null } | null;
};
export type EntityOption = { id: string; name: string; kind: string; status: string; suggested: boolean };

const STATUS: Record<string, string> = {
  draft: "Utkast",
  ai_drafted: "Utkast",
  changes_requested: "Ändringar begärda",
  in_review: "Hos GoodTribes granskning",
  approved: "Godkänd av GoodTribes",
  review_rejected: "Avslagen i granskningen",
  submitted: "Inlämnad",
  awarded: "Beviljad",
  rejected: "Avslagen av finansiären",
  withdrawn: "Återtagen",
};
const KIND: Record<string, string> = { LIMITED_COMPANY: "aktiebolag", FOUNDATION: "stiftelse", NONPROFIT: "ideell", PARTNER: "partner som söker själv" };
const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const primary = "rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-watermelon disabled:opacity-50";

// Utlysningar (#346): one application to a funding call, from the first
// draft to the outcome. Who applies, what the call asks for (a checklist),
// how much, co-funding — then GoodTribes' review, and only after an
// approval "Jag har lämnat in den".
export default function CallApplicationCard({ app, entities, projectSlug, canManage }: { app: CallApplication; entities: EntityOption[]; projectSlug: string; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<string[]>(app.findings);
  const initial = { applicantEntityId: app.entityId ?? "", requirementsDone: app.requirementsDone, amountRequestedSek: app.amountRequestedSek?.toString() ?? "", cofundingNote: app.cofundingNote ?? "" };
  const [f, setF] = useState(initial);
  const [outcomeAmount, setOutcomeAmount] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const editable = canManage && ["draft", "ai_drafted", "changes_requested"].includes(app.status);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const partner = entities.find((e) => e.id === f.applicantEntityId)?.kind === "PARTNER";
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long" });

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        const res = (await fn()) as { error?: string; findings?: string[] } | undefined;
        if (res?.findings) setFindings(res.findings);
        else if (res?.error) setError(res.error);
        else setFindings([]);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel");
      }
    });

  return (
    <div className="rounded-lg border border-muted-teal/40 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {app.call.slug ? (
          <Link href={`/utlysningar/${app.call.slug}`} className="font-medium text-dark-slate hover:underline">{app.call.title}</Link>
        ) : (
          <p className="font-medium text-dark-slate">{app.call.title}</p>
        )}
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{STATUS[app.status] ?? app.status}</span>
      </div>
      <p className="mb-3 text-xs text-dark-slate/50">
        {app.call.deadline && `Finansiärens deadline ${dateFmt(app.call.deadline)}`}
        {app.reviewBy && ` · till GoodTribes granskning senast ${dateFmt(app.reviewBy)}`}
        {app.entityName && ` · sökande: ${app.entityName}`}
      </p>

      {app.decision && app.decision.result !== "OK" && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">{app.decision.result === "CHANGES" ? "Granskaren vill att ni ändrar:" : "Granskningen avslog ansökan:"}</p>
          {app.decision.motivation && <p className="mt-1 whitespace-pre-line">{app.decision.motivation}</p>}
        </div>
      )}

      {editable && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Vem står som sökande</span>
            <select value={f.applicantEntityId} onChange={(e) => setF({ ...f, applicantEntityId: e.target.value })} className={input}>
              <option value="">Välj …</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({KIND[e.kind] ?? e.kind}{e.status !== "EXISTS" ? ", inte bildad än" : ""}){e.suggested ? " · föreslagen" : ""}
                </option>
              ))}
            </select>
          </label>
          {app.call.requirements.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Det här ska ansökan innehålla</span>
              {app.call.requirements.map((r) => (
                <label key={r} className="flex items-start gap-2 text-sm text-dark-slate/80">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={f.requirementsDone.includes(r)}
                    onChange={(e) => setF({ ...f, requirementsDone: e.target.checked ? [...f.requirementsDone, r] : f.requirementsDone.filter((x) => x !== r) })}
                  />
                  {r}
                </label>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Ni söker (kr)</span>
              <input value={f.amountRequestedSek} onChange={(e) => setF({ ...f, amountRequestedSek: e.target.value })} inputMode="numeric" className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">Medfinansiering{app.cofunding ? ` (${app.cofunding})` : ""}</span>
              <input value={f.cofundingNote} onChange={(e) => setF({ ...f, cofundingNote: e.target.value })} placeholder="Hur ordnas den?" className={input} />
            </label>
          </div>
          {findings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">Att åtgärda innan granskningen:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
                {findings.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending || !dirty} onClick={() => run(() => saveCallApplication(app.id, projectSlug, f))} className={primary}>
              Spara
            </button>
            {partner ? (
              <button type="button" disabled={pending || dirty} onClick={() => run(() => markSubmitted(app.id, projectSlug))} className="text-xs font-medium text-seagrass hover:underline disabled:opacity-50">
                Partnern har lämnat in den
              </button>
            ) : (
              <button type="button" disabled={pending || dirty} onClick={() => run(() => requestReview(app.id, projectSlug))} className="rounded-md border border-seagrass px-3 py-1.5 text-xs font-medium text-seagrass hover:bg-seagrass/10 disabled:opacity-50">
                Skicka till GoodTribes granskning
              </button>
            )}
            {dirty && <span className="text-xs text-dark-slate/50">Spara först.</span>}
          </div>
        </div>
      )}

      {app.status === "in_review" && <p className="text-sm text-dark-slate/70">GoodTribes granskar ansökan. Ni får en notis när granskaren har bestämt sig.</p>}

      {app.status === "approved" && canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="w-full text-sm text-dark-slate/70">Godkänd. Lämna in ansökan i finansiärens system, i {app.entityName ?? "enhetens"} namn.</p>
          {(app.call.applyUrl || app.call.url) && (
            <a href={(app.call.applyUrl || app.call.url)!} target="_blank" rel="noreferrer" className="text-xs font-medium text-seagrass hover:underline">
              Öppna ansökningsportalen ↗
            </a>
          )}
          <button type="button" disabled={pending} onClick={() => run(() => markSubmitted(app.id, projectSlug))} className={primary}>
            Jag har lämnat in den
          </button>
        </div>
      )}

      {app.status === "submitted" && canManage && (
        <div className="space-y-2">
          <p className="text-xs text-dark-slate/50">Inlämnad {app.submittedAt ? dateFmt(app.submittedAt) : ""}. Registrera utfallet när ni fått besked:</p>
          <div className="flex flex-wrap gap-2">
            <input type="number" placeholder="Beviljat belopp (kr)" value={outcomeAmount} onChange={(e) => setOutcomeAmount(e.target.value)} className={`${input} w-44`} />
            <input placeholder="Kommentar (valfritt)" value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} className={`${input} min-w-0 flex-1`} />
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={pending} onClick={() => run(() => recordOutcome(app.id, projectSlug, "awarded", outcomeAmount ? parseInt(outcomeAmount, 10) : null, outcomeNote))} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              Beviljad
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => recordOutcome(app.id, projectSlug, "rejected", null, outcomeNote))} className="text-xs font-medium text-dark-slate/60 hover:text-dark-slate disabled:opacity-50">
              Avslagen
            </button>
          </div>
        </div>
      )}
      {(app.status === "awarded" || app.status === "rejected") && (
        <p className="text-xs text-dark-slate/50">{app.outcomeAmountSek ? `${app.outcomeAmountSek} kr · ` : ""}{app.outcomeNote ?? ""}</p>
      )}
      {error && <p className="mt-2 text-xs text-watermelon">{error}</p>}
    </div>
  );
}
