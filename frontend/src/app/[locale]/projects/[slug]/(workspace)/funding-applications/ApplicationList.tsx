"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  requestAiDraft,
  approveDraftForSubmission,
  markSubmitted,
  recordOutcome,
} from "./actions";
import type { FundingApplication, FundingSource } from "@prisma/client";

type ApplicationWithSource = FundingApplication & { fundingSource: FundingSource };

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  ai_drafted: "AI-utkast klart",
  ready_for_review: "Godkänd, redo att skickas",
  submitted: "Inskickad",
  awarded: "Beviljad",
  rejected: "Avslagen",
  withdrawn: "Återtagen",
};

function ApplicationCard({
  application,
  projectSlug,
  canManage,
  aiModeEnabled,
}: {
  application: ApplicationWithSource;
  projectSlug: string;
  canManage: boolean;
  aiModeEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [outcomeAmount, setOutcomeAmount] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel");
      }
    });
  }

  return (
    <div className="border border-muted-teal/40 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-medium text-dark-slate">{application.fundingSource.name}</p>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium shrink-0">
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      </div>
      {application.deadline && (
        <p className="text-xs text-dark-slate/40 mb-2">
          Deadline: {new Date(application.deadline).toLocaleDateString("sv-SE")}
        </p>
      )}

      {application.draftMarkdown && (
        <details className="mb-3">
          <summary className="text-xs text-seagrass cursor-pointer">Visa utkast</summary>
          <pre className="whitespace-pre-wrap font-sans text-sm text-dark-slate/80 leading-relaxed mt-2 border-t border-muted-teal/20 pt-2">
            {application.draftMarkdown}
          </pre>
        </details>
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          {(application.status === "draft") && aiModeEnabled && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => requestAiDraft(application.id, projectSlug))}
              className="text-xs font-medium bg-coral text-white px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
            >
              {isPending ? "Förbereder…" : "Förbered AI-utkast"}
            </button>
          )}
          {application.status === "draft" && !aiModeEnabled && (
            <p className="text-xs text-dark-slate/40">
              AI-läge är avstängt för bidragsansökningar i det här projektet — sätt det till Agent på AI-granskningssidan för att kunna be AI förbereda ett utkast.
            </p>
          )}

          {application.status === "ai_drafted" && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => approveDraftForSubmission(application.id, projectSlug))}
                className="text-xs font-medium bg-coral text-white px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Godkänn för inskickning
              </button>
              {aiModeEnabled && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => requestAiDraft(application.id, projectSlug))}
                  className="text-xs font-medium text-dark-slate/40 hover:text-dark-slate transition-colors disabled:opacity-50"
                >
                  Be AI göra om utkastet
                </button>
              )}
            </>
          )}

          {application.status === "ready_for_review" && (
            <>
              {application.fundingSource.applicationUrl && (
                <a
                  href={application.fundingSource.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-seagrass hover:underline"
                >
                  Öppna ansökningsportal →
                </a>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => markSubmitted(application.id, projectSlug))}
                className="text-xs font-medium bg-coral text-white px-3 py-1.5 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                Jag har skickat in den
              </button>
            </>
          )}

          {application.status === "submitted" && (
            <div className="w-full space-y-2">
              <p className="text-xs text-dark-slate/40">Registrera utfall när ni fått besked:</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Beviljat belopp (kr)"
                  value={outcomeAmount}
                  onChange={(e) => setOutcomeAmount(e.target.value)}
                  className="flex-1 border border-muted-teal/60 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <textarea
                placeholder="Kommentar (valfritt)"
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                rows={2}
                className="w-full border border-muted-teal/60 rounded-md px-2 py-1 text-xs resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => recordOutcome(application.id, projectSlug, "awarded", outcomeAmount ? parseInt(outcomeAmount, 10) : null, outcomeNote))}
                  className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Beviljad
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => recordOutcome(application.id, projectSlug, "rejected", null, outcomeNote))}
                  className="text-xs font-medium text-dark-slate/60 hover:text-dark-slate transition-colors disabled:opacity-50"
                >
                  Avslagen
                </button>
              </div>
            </div>
          )}

          {(application.status === "awarded" || application.status === "rejected") && (
            <p className="text-xs text-dark-slate/40">
              {application.outcomeAmountSek ? `${application.outcomeAmountSek} kr · ` : ""}
              {application.outcomeNote ?? ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicationList({
  applications,
  projectSlug,
  canManage,
  aiModeEnabled,
}: {
  applications: ApplicationWithSource[];
  projectSlug: string;
  canManage: boolean;
  aiModeEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {applications.map((a) => (
        <ApplicationCard key={a.id} application={a} projectSlug={projectSlug} canManage={canManage} aiModeEnabled={aiModeEnabled} />
      ))}
    </div>
  );
}
