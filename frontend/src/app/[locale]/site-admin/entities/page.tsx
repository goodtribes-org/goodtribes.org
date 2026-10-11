import { prisma } from "@/lib/prisma";
import EntityEditor, { NewEntity } from "./EntityEditor";
import { KIND_LABELS, STATUS_LABELS } from "@/lib/fundingCalls/review";

// GoodTribes entities (#346): who stands as applicant for a funding call
// (and, for the umbrella ABs, who invoices). Every application records its
// entity, so each builds a history of what it applied for and got.
export default async function EntitiesAdminPage() {
  const entities = await prisma.commercialUmbrellaEntity.findMany({
    orderBy: { createdAt: "asc" },
    include: { reviewers: { select: { email: true } }, _count: { select: { applications: true } } },
  });
  const awarded = await prisma.fundingApplication.groupBy({ by: ["applicantEntityId"], where: { status: "awarded", applicantEntityId: { not: null } }, _count: true });
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-dark-slate">GoodTribes-enheter</h1>
      <p className="mt-1 text-sm text-dark-slate/60">
        Vilka juridiska enheter som kan stå som sökande på en utlysning. Systemet föreslår enhet utifrån vem som får söka, med dotterbolag före stiftelsen, och förslaget godkänns i granskningen. Strukturen är inte slutgiltig: vilken enhet som tar utlysningar för ideella föreningar är fortfarande en öppen fråga.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {entities.map((e) => (
          <details key={e.id} className="rounded-xl border border-muted-teal/30 bg-white p-4">
            <summary className="cursor-pointer">
              <span className="font-semibold text-dark-slate">{e.name}</span>
              <span className="ml-2 text-xs text-dark-slate/55">
                {KIND_LABELS[e.kind]} · {STATUS_LABELS[e.status]} · {e._count.applications} ansökningar · {awarded.find((a) => a.applicantEntityId === e.id)?._count ?? 0} beviljade
              </span>
            </summary>
            <div className="mt-4">
              <EntityEditor
                id={e.id}
                initial={{
                  name: e.name, orgNumber: e.foundationAbOrgNumber ?? "", kind: e.kind, status: e.status, applicantTypes: e.applicantTypes,
                  signatoryName: e.signatoryName ?? "", signatoryEmail: e.signatoryEmail ?? "", reviewerEmails: e.reviewers.map((r) => r.email).filter(Boolean).join(", "),
                }}
              />
            </div>
          </details>
        ))}
        <NewEntity />
      </div>
    </div>
  );
}
