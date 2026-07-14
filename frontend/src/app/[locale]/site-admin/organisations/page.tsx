import { prisma } from "@/lib/prisma"
import Link from "next/link";
import { reviewOrgFlag, setOrganisationVerified } from "./actions";


export default async function OrganisationsAdminPage() {
  const [flags, orgs] = await Promise.all([
    prisma.organisationFlag.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        organisation: { select: { name: true, slug: true } },
        flaggedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.organisation.findMany({
      where: { isPublic: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, verified: true },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-12">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-slate">Organisationsgranskning</h1>
          <p className="text-sm text-dark-slate/60 mt-1">
            Hantera flaggade organisationer. {flags.length} avvaktar granskning.
          </p>
        </div>

        {flags.length === 0 ? (
          <div className="border border-muted-teal/30 rounded-lg p-8 text-center text-dark-slate/50">
            Inga flaggade organisationer att granska.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="border border-muted-teal/40 rounded-lg p-5 bg-white"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link
                      href={`/org/${flag.organisation.slug}`}
                      className="font-semibold text-dark-slate hover:text-coral transition-colors"
                    >
                      {flag.organisation.name}
                    </Link>
                    <p className="text-sm text-dark-slate/60 mt-0.5">
                      {flag.reason}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                    Avvaktar
                  </span>
                </div>

                <div className="text-xs text-dark-slate/50 mb-4">
                  Flaggad av{" "}
                  <span className="font-medium text-dark-slate/70">
                    {flag.flaggedBy.name ?? flag.flaggedBy.email}
                  </span>{" "}
                  · {flag.createdAt.toLocaleDateString("sv-SE")}
                </div>

                <div className="flex flex-wrap gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await reviewOrgFlag(flag.id, "dismissed");
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
                    >
                      Avfärda
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await reviewOrgFlag(flag.id, "warned", "Organisationen har fått en varning från administratören.");
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded border border-amber-300 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      Varna organisation
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await reviewOrgFlag(flag.id, "removed", "Organisationen har avpublicerats av administratören.");
                    }}
                  >
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Avpublicera organisation
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-dark-slate">Verifiering</h2>
          <p className="text-sm text-dark-slate/60 mt-1">
            Verifierade organisationer visas med en badge på sin sida och i katalogen.
          </p>
        </div>

        <div className="flex flex-col divide-y divide-muted-teal/20 border border-muted-teal/30 rounded-lg overflow-hidden">
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white">
              <Link href={`/org/${org.slug}`} className="text-sm font-medium text-dark-slate hover:text-coral transition-colors">
                {org.name}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await setOrganisationVerified(org.id, !org.verified);
                }}
              >
                <button
                  type="submit"
                  className={
                    org.verified
                      ? "px-3 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
                      : "px-3 py-1.5 rounded bg-seagrass text-white text-xs font-medium hover:bg-seagrass/80 transition-colors"
                  }
                >
                  {org.verified ? "Ta bort verifiering" : "Verifiera"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
