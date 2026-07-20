import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isCouncilMember } from "@/lib/authz";
import { reviewFlag, reviewProjectContentFlag } from "@/app/[locale]/site-admin/ethics/actions";

type PendingFlagRow = {
  id: string;
  source: "legacy" | "contentFlag";
  title: string;
  slug: string;
  reason: string;
  flaggedByLabel: string;
  createdAt: Date;
};

// Council-facing counterpart to site-admin/ethics — same underlying
// ProjectFlag/ContentFlag review actions (both now accept council members
// as well as site-admin staff, see lib/authz.ts canReviewEthicsFlags), but
// reachable outside the ADMIN/OWNER-only site-admin gate (PRD 5.53/5.54).
export default async function CouncilEthicsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isCouncilMember(session.user.id))) notFound();

  const [legacyFlags, contentFlags] = await Promise.all([
    prisma.projectFlag.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        project: { select: { title: true, slug: true } },
        flaggedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.contentFlag.findMany({
      where: { targetType: "Project", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { flaggedBy: { select: { name: true, email: true } } },
    }),
  ]);

  const contentFlagProjects = await prisma.project.findMany({
    where: { id: { in: contentFlags.map((f) => f.targetId) } },
    select: { id: true, title: true, slug: true },
  });
  const projectById = new Map(contentFlagProjects.map((p) => [p.id, p]));

  const flags: PendingFlagRow[] = [
    ...legacyFlags.map((f) => ({
      id: f.id,
      source: "legacy" as const,
      title: f.project.title,
      slug: f.project.slug,
      reason: f.reason,
      flaggedByLabel: f.flaggedBy.name ?? f.flaggedBy.email,
      createdAt: f.createdAt,
    })),
    ...contentFlags
      .filter((f) => projectById.has(f.targetId))
      .map((f) => {
        const project = projectById.get(f.targetId)!;
        return {
          id: f.id,
          source: "contentFlag" as const,
          title: project.title,
          slug: project.slug,
          reason: f.reason,
          flaggedByLabel: f.flaggedBy.name ?? f.flaggedBy.email,
          createdAt: f.createdAt,
        };
      }),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <Link href="/granskningsradet" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          ← Granskningsrådet
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">Etikgranskning</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Flaggade projekt att granska. {flags.length} avvaktar granskning.
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="border border-muted-teal/30 rounded-lg p-8 text-center text-dark-slate/50">
          Inga flaggade projekt att granska.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {flags.map((flag) => (
            <div key={flag.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <Link
                    href={`/projects/${flag.slug}`}
                    className="font-semibold text-dark-slate hover:text-coral transition-colors"
                  >
                    {flag.title}
                  </Link>
                  <p className="text-sm text-dark-slate/60 mt-0.5">{flag.reason}</p>
                </div>
                <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  Avvaktar
                </span>
              </div>

              <div className="text-xs text-dark-slate/50 mb-4">
                Flaggad av <span className="font-medium text-dark-slate/70">{flag.flaggedByLabel}</span> ·{" "}
                {flag.createdAt.toLocaleDateString("sv-SE")}
              </div>

              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    if (flag.source === "legacy") await reviewFlag(flag.id, "dismissed");
                    else await reviewProjectContentFlag(flag.id, "dismissed");
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
                    if (flag.source === "legacy") await reviewFlag(flag.id, "warned", "Projektet har fått en varning från Granskningsrådet.");
                    else await reviewProjectContentFlag(flag.id, "warned", "Projektet har fått en varning från Granskningsrådet.");
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
                    if (flag.source === "legacy") await reviewFlag(flag.id, "removed", "Projektet har tagits bort av Granskningsrådet.");
                    else await reviewProjectContentFlag(flag.id, "removed", "Projektet har tagits bort av Granskningsrådet.");
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
