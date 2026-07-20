import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  pending: "Väntar på röstning",
  approved_by_members: "Godkänt av medlemmarna — väntar på Stiftelsen",
  rejected_by_members: "Avslaget av medlemmarna",
  vetoed_by_foundation: "Nedlagt veto av Stiftelsen",
  executed: "Genomförd",
};

export default async function ProfitDistributionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
        <h1 className="text-2xl font-bold text-dark-slate">Vinstfördelning</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Se PRD 4a för hela flödet: styrelsens förslag, medlemmarnas röstning och Stiftelsens genomförande.
        </p>
      </div>

      {proposals.length === 0 ? (
        <p className="text-sm text-dark-slate/40">
          Inget vinstfördelningsförslag har lagts fram för {project.title} ännu.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {proposals.map((p) => (
            <div key={p.id} className="border border-muted-teal rounded-lg p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-dark-slate">
                  {p.auditedProfitSek.toLocaleString("sv-SE")} kr
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <p className="text-sm text-dark-slate/60 mb-2">
                {p.proposedOperationsPct}% drift, {p.proposedImpactFundPct}% Impact-fond,{" "}
                {100 - p.proposedOperationsPct - p.proposedImpactFundPct}% till bidragsgivare
              </p>
              {p.pollId && (
                <Link
                  href={`/projects/${slug}/polls/${p.pollId}`}
                  className="text-sm text-seagrass hover:underline"
                >
                  Se omröstningen →
                </Link>
              )}
              {p.decisionNote && (
                <p className="text-xs text-dark-slate/50 mt-2">Motivering: {p.decisionNote}</p>
              )}
              {p.distribution && (
                <div className="mt-3 pt-3 border-t border-muted-teal/50 text-xs text-dark-slate/60">
                  Drift: {p.distribution.operationsShareSek.toLocaleString("sv-SE")} kr · Impact-fond:{" "}
                  {p.distribution.impactFundShareSek.toLocaleString("sv-SE")} kr · Till bidragsgivare:{" "}
                  {p.distribution.remainingShareSek.toLocaleString("sv-SE")} kr (
                  {p.distribution.allocations.length} personliga andelar)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
