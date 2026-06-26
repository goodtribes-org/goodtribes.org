import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { reviewFlag } from "./actions";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "niklas.gunnas@goodtribes.org";

export default async function EthicsAdminPage() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    notFound();
  }

  const flags = await prisma.projectFlag.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: {
      project: { select: { title: true, slug: true } },
      flaggedBy: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Etikgranskning</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Hantera flaggade projekt. {flags.length} avvaktar granskning.
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="border border-muted-teal/30 rounded-lg p-8 text-center text-dark-slate/50">
          Inga flaggade projekt att granska.
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
                    href={`/projects/${flag.project.slug}`}
                    className="font-semibold text-dark-slate hover:text-coral transition-colors"
                  >
                    {flag.project.title}
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
                    await reviewFlag(flag.id, "dismissed");
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
                    await reviewFlag(flag.id, "warned", "Projektet har fått en varning från administratören.");
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-amber-300 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    Varna projekt
                  </button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await reviewFlag(flag.id, "removed", "Projektet har tagits bort av administratören.");
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-red-300 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Ta bort projekt
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
