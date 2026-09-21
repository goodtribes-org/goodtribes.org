import { prisma } from "@/lib/prisma";
import FundingSourcesEditor from "./FundingSourcesEditor";

export default async function FundingSourcesAdminPage() {
  const sources = await prisma.fundingSource.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Fondkatalog</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Fonder, stiftelser och myndighetsbidrag som matchas mot projekt automatiskt utifrån SDG-mål, juridisk form och beloppsintervall.
        </p>
      </div>
      <FundingSourcesEditor initialSources={sources} />
    </div>
  );
}
