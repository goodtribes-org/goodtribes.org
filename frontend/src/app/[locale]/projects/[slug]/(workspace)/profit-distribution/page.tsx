import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function ProfitDistributionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("ProfitDistributionPage");
  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    approved_by_members: t("statusApprovedByMembers"),
    rejected_by_members: t("statusRejectedByMembers"),
    vetoed_by_foundation: t("statusVetoedByFoundation"),
    executed: t("statusExecuted"),
  };

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, legalType: true },
  });
  if (!project) notFound();

  const proposals = await prisma.profitDistributionProposal.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: {
      distribution: {
        include: {
          allocations: { select: { amountAvailableSek: true, targetProjectSlug: true, processedAt: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-sm text-dark-slate/40">
          {t("emptyState", { title: project.title })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {proposals.map((p) => (
            <div key={p.id} className="border border-muted-teal rounded-lg p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-dark-slate">
                  {t("amountSek", { amount: p.auditedProfitSek.toLocaleString("sv-SE") })}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <p className="text-sm text-dark-slate/60 mb-2">
                {t("breakdown", {
                  opsPct: p.proposedOperationsPct,
                  impactPct: p.proposedImpactFundPct,
                  remainingPct: 100 - p.proposedOperationsPct - p.proposedImpactFundPct,
                })}
              </p>
              {p.pollId && (
                <Link
                  href={`/projects/${slug}/polls/${p.pollId}`}
                  className="text-sm text-seagrass hover:underline"
                >
                  {t("viewPoll")}
                </Link>
              )}
              {p.decisionNote && (
                <p className="text-xs text-dark-slate/50 mt-2">{t("decisionNote", { note: p.decisionNote })}</p>
              )}
              {p.distribution && (
                <div className="mt-3 pt-3 border-t border-muted-teal/50 text-xs text-dark-slate/60">
                  {t("distributionSummary", {
                    operations: p.distribution.operationsShareSek.toLocaleString("sv-SE"),
                    impactFund: p.distribution.impactFundShareSek.toLocaleString("sv-SE"),
                    remaining: p.distribution.remainingShareSek.toLocaleString("sv-SE"),
                    count: p.distribution.allocations.length,
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
