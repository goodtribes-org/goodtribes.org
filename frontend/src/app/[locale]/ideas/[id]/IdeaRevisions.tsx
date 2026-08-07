"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { proposeRevision, decideRevision } from "./actions";

interface RevisionAuthor {
  name: string | null;
}

interface Revision {
  id: string;
  proposedDescription: string;
  status: string;
  createdAt: string;
  proposedBy: RevisionAuthor;
}

interface IdeaRevisionsProps {
  ideaId: string;
  revisions: Revision[];
  isLoggedIn: boolean;
  canDecide: boolean;
}

export default function IdeaRevisions({ ideaId, revisions, isLoggedIn, canDecide }: IdeaRevisionsProps) {
  const t = useTranslations("IdeaRevisions");
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  function timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return t("timeJustNow");
    const m = Math.floor(s / 60);
    if (m < 60) return t("timeMinutesAgo", { minutes: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("timeHoursAgo", { hours: h });
    return t("timeDaysAgo", { days: Math.floor(h / 24) });
  }

  const pendingRevisions = revisions.filter((r) => r.status === "pending");
  const decidedRevisions = revisions.filter((r) => r.status !== "pending");

  function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    const value = ref.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(async () => {
      await proposeRevision(ideaId, value);
      if (ref.current) ref.current.value = "";
      setShowForm(false);
    });
  }

  function handleDecide(revisionId: string, decision: "accept" | "reject") {
    startTransition(async () => {
      await decideRevision(revisionId, decision);
    });
  }

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-dark-slate uppercase tracking-wider mb-3">
        {t("proposedEditsHeading", { count: pendingRevisions.length })}
      </h2>

      {pendingRevisions.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {pendingRevisions.map((r) => (
            <div key={r.id} className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-dark-slate/50">
                <span className="font-medium text-dark-slate">{r.proposedBy.name ?? t("unknownAuthor")}</span>
                <span>·</span>
                <span>{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-sm text-dark-slate/80 leading-relaxed whitespace-pre-wrap mb-3">
                {r.proposedDescription}
              </p>
              {canDecide && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecide(r.id, "accept")}
                    disabled={pending}
                    className="px-3 py-1.5 bg-seagrass text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {t("acceptButton")}
                  </button>
                  <button
                    onClick={() => handleDecide(r.id, "reject")}
                    disabled={pending}
                    className="px-3 py-1.5 border border-muted-teal text-dark-slate/70 text-xs font-medium rounded-lg hover:border-coral hover:text-coral transition-colors disabled:opacity-50"
                  >
                    {t("rejectButton")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoggedIn &&
        (showForm ? (
          <form onSubmit={handlePropose} className="flex flex-col gap-2 mb-4">
            <textarea
              ref={ref}
              rows={4}
              placeholder={t("revisionPlaceholder")}
              className="w-full border border-muted-teal rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-xs text-dark-slate/60 hover:text-dark-slate"
              >
                {t("cancelButton")}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
              >
                {pending ? t("submittingButton") : t("proposeEditButton")}
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="text-sm text-coral hover:underline mb-4">
            {t("proposeEditToggle")}
          </button>
        ))}

      {decidedRevisions.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-dark-slate/50 hover:text-dark-slate">
            {t("pastProposalsSummary", { count: decidedRevisions.length })}
          </summary>
          <div className="flex flex-col gap-3 mt-3">
            {decidedRevisions.map((r) => (
              <div key={r.id}>
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <span className="font-medium text-dark-slate">{r.proposedBy.name ?? t("unknownAuthor")}</span>
                  <span className="text-dark-slate/40">{timeAgo(r.createdAt)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      r.status === "accepted" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.status === "accepted" ? t("statusAccepted") : r.status === "rejected" ? t("statusRejected") : r.status}
                  </span>
                </div>
                <p className="text-dark-slate/70 leading-relaxed whitespace-pre-wrap">{r.proposedDescription}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
