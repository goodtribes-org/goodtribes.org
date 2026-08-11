import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { allocateProfitShare } from "../actions";
import type { Locale } from "next-intl";

export default async function MinaFordelningarPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "MinaFordelningarPage" }),
  ]);
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
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">{t("intro")}</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("pendingHeading", { count: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("noPending")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((a) => (
              <div key={a.id} className="border border-muted-teal rounded-lg p-5">
                <p className="font-semibold text-dark-slate">
                  {t("amountFromProject", { amount: a.amountAvailableSek.toLocaleString("sv-SE"), project: a.distribution.project.title })}
                </p>
                <p className="text-xs text-dark-slate/50 mb-3">
                  {t("deadlineNote", { date: a.allocationDeadline.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }) })}
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
                    <option value="">{t("chooseProject")}</option>
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
                    {t("allocateButton")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">{t("historyHeading")}</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("noHistory")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {resolved.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-muted-teal/40 pb-2">
                <span className="text-dark-slate/70">
                  {t("amountFromProjectShort", { amount: a.amountAvailableSek.toLocaleString("sv-SE"), project: a.distribution.project.title })}
                </span>
                <span className="text-dark-slate/50">
                  {a.targetProjectSlug ? `→ ${a.targetProjectSlug}` : t("toImpactFundUnset")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
