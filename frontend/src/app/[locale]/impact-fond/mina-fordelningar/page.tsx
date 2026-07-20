import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allocateProfitShare } from "../actions";

export default async function MinaFordelningarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allocations = await prisma.personalProfitAllocation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      distribution: { include: { project: { select: { title: true } } } },
    },
  });

  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    select: { title: true, slug: true },
    orderBy: { title: "asc" },
    take: 500,
  });

  const pending = allocations.filter((a) => !a.processedAt);
  const resolved = allocations.filter((a) => a.processedAt);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate">Mina fördelningar</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Din personliga andel av vinstdelande projekts överskott (PRD 4a, Steg 2). Pengarna är redan dina — välj
          vilket projekt du vill rikta dem till.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Väntar på ditt val ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inget väntar på ditt val just nu.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((a) => (
              <div key={a.id} className="border border-muted-teal rounded-lg p-5">
                <p className="font-semibold text-dark-slate">
                  {a.amountAvailableSek.toLocaleString("sv-SE")} kr — från {a.distribution.project.title}
                </p>
                <p className="text-xs text-dark-slate/50 mb-3">
                  Väljer du inget innan{" "}
                  {a.allocationDeadline.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}{" "}
                  går andelen automatiskt till Impact-fonden.
                </p>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await allocateProfitShare(a.id, (formData.get("targetProjectSlug") as string) ?? "");
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <select
                    name="targetProjectSlug"
                    required
                    className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="">— välj projekt —</option>
                    {projects.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                  >
                    Rikta min andel
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Historik</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Ingen historik ännu.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {resolved.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-muted-teal/40 pb-2">
                <span className="text-dark-slate/70">
                  {a.amountAvailableSek.toLocaleString("sv-SE")} kr från {a.distribution.project.title}
                </span>
                <span className="text-dark-slate/50">
                  {a.targetProjectSlug ? `→ ${a.targetProjectSlug}` : "→ Impact-fonden (ej valt i tid)"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
