export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { isCouncilMember } from "@/lib/authz";
import { ProposeDecisionForm, CastVoteForm } from "./CaseActions";

export const metadata: Metadata = {
  title: "Ärende — Granskningsrådet",
};

const RESPONSE_WINDOW_HOURS = 72;

const DECISION_LABEL: Record<string, string> = {
  none: "Ingen åtgärd",
  warning: "Varning",
  project_ban: "Uteslutning från projektet",
  platform_ban: "Uteslutning från hela plattformen",
};

export default async function ExclusionCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const isCouncil = await isCouncilMember(userId);

  const exclusionCase = await prisma.exclusionCase.findUnique({
    where: { id: caseId },
    include: {
      reportedUser: { select: { id: true, name: true } },
      reportedBy: { select: { name: true } },
      project: { select: { title: true, slug: true } },
      votes: { include: { councilMember: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!exclusionCase) notFound();

  const isReportedParty = exclusionCase.reportedUserId === userId;
  if (!isCouncil && !isReportedParty) notFound();

  const activeCouncilCount = await prisma.reviewCouncilMember.count({ where: { termEnd: { gt: new Date() } } });
  const myVote = exclusionCase.votes.find((v) => v.councilMemberId === userId) ?? null;

  const responseWindowElapsed =
    Date.now() - exclusionCase.createdAt.getTime() > RESPONSE_WINDOW_HOURS * 60 * 60 * 1000;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/granskningsradet/arenden" className="text-sm text-dark-slate/50 hover:text-dark-slate">
        ← Öppna ärenden
      </Link>

      <div className="my-4">
        <h1 className="text-xl font-bold text-dark-slate">
          Anmälan mot {exclusionCase.reportedUser.name ?? "Okänd"}
        </h1>
        {exclusionCase.project && (
          <p className="text-sm text-dark-slate/50 mt-0.5">
            Gäller projektet{" "}
            <Link href={`/projects/${exclusionCase.project.slug}`} className="text-coral hover:underline">
              {exclusionCase.project.title}
            </Link>
          </p>
        )}
      </div>

      <section className="border border-muted-teal/40 rounded-lg p-4 mb-4 bg-white">
        <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Anmälan</p>
        <p className="text-sm text-dark-slate/80 whitespace-pre-wrap">{exclusionCase.reason}</p>
        <p className="text-xs text-dark-slate/40 mt-2">
          Anmäld av {exclusionCase.reportedBy.name ?? "Okänd"} · {exclusionCase.createdAt.toLocaleDateString("sv-SE")}
        </p>
      </section>

      <section className="border border-muted-teal/40 rounded-lg p-4 mb-4 bg-white">
        <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Svar från den anmälda</p>
        {exclusionCase.responseText ? (
          <p className="text-sm text-dark-slate/80 whitespace-pre-wrap">{exclusionCase.responseText}</p>
        ) : isReportedParty && exclusionCase.status === "open" ? (
          <div>
            <p className="text-sm text-dark-slate/50 mb-2">Du har inte svarat på anmälan ännu.</p>
            <Link
              href={`/granskningsradet/arenden/${caseId}/svara`}
              className="inline-block px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
            >
              Svara på anmälan
            </Link>
          </div>
        ) : (
          <p className="text-sm text-dark-slate/40">
            {responseWindowElapsed ? "Inget svar lämnades inom svarsfönstret." : "Väntar på svar från den anmälda."}
          </p>
        )}
      </section>

      {exclusionCase.status === "resolved" ? (
        <section className="border border-muted-teal/40 rounded-lg p-4 bg-dry-sage/20">
          <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Beslut</p>
          <p className="text-sm font-medium text-dark-slate">{DECISION_LABEL[exclusionCase.decision ?? ""] ?? exclusionCase.decision}</p>
          {exclusionCase.decisionReasoning && (
            <p className="text-sm text-dark-slate/60 mt-1 whitespace-pre-wrap">{exclusionCase.decisionReasoning}</p>
          )}
          <p className="text-xs text-dark-slate/40 mt-2">
            Avgjort {exclusionCase.decidedAt?.toLocaleDateString("sv-SE")}
          </p>
        </section>
      ) : isCouncil ? (
        <div className="flex flex-col gap-4">
          {exclusionCase.status === "open" && (
            <ProposeDecisionForm caseId={caseId} />
          )}
          {exclusionCase.status === "under_review" && (
            <>
              <section className="border border-muted-teal/40 rounded-lg p-4 bg-amber-50">
                <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Föreslaget beslut</p>
                <p className="text-sm font-medium text-dark-slate">
                  {DECISION_LABEL[exclusionCase.proposedDecision ?? ""] ?? exclusionCase.proposedDecision}
                </p>
                <p className="text-xs text-dark-slate/50 mt-2">
                  {exclusionCase.votes.length} av {activeCouncilCount} ledamöter har röstat
                </p>
                <ul className="text-xs text-dark-slate/50 mt-1 flex flex-col gap-0.5">
                  {exclusionCase.votes.map((v) => (
                    <li key={v.id}>
                      {v.councilMember.name ?? "Okänd"}: {v.vote === "approve" ? "Godkänner" : "Avslår"}
                      {v.reasoning ? ` — ${v.reasoning}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
              <CastVoteForm caseId={caseId} myVote={myVote} />
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-dark-slate/40">Ärendet hanteras av Granskningsrådet.</p>
      )}
    </div>
  );
}
