import { prisma } from "@/lib/prisma";
import { LEGAL_TYPES, LEGAL_TYPE_LABEL } from "@/lib/legalType";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import {
  executeLegalTypeChange,
  rejectLegalTypeChange,
  createUmbrellaEntity,
  setLegalTypeDirectly,
} from "./actions";

export default async function LegalTypeAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SiteAdminLegalType" });

  const [pendingRequests, umbrellaEntities] = await Promise.all([
    prisma.legalTypeChangeRequest.findMany({
      where: { status: "approved_by_members" },
      orderBy: { createdAt: "asc" },
      include: { project: { select: { title: true, slug: true } } },
    }),
    prisma.commercialUmbrellaEntity.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          {t("description")}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("pendingHeading", { count: pendingRequests.length })}
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-dark-slate/40">{t("noPendingRequests")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingRequests.map((r) => (
              <div key={r.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
                <p className="font-semibold text-dark-slate">{r.project.title}</p>
                <p className="text-sm text-dark-slate/60 mb-3">
                  {t.rich("requestedChange", {
                    type: LEGAL_TYPE_LABEL[r.requestedType] ?? r.requestedType,
                    bold: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await executeLegalTypeChange(r.id, (formData.get("umbrellaEntityId") as string) || undefined);
                  }}
                  className="flex flex-wrap items-end gap-2 mb-2"
                >
                  {r.requestedType === "COMMERCIAL_UMBRELLA" && (
                    <select
                      name="umbrellaEntityId"
                      className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
                    >
                      <option value="">{t("selectUmbrellaAbOption")}</option>
                      {umbrellaEntities.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                  >
                    {t("executeTransitionButton")}
                  </button>
                </form>

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await rejectLegalTypeChange(r.id, (formData.get("note") as string) ?? "");
                  }}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input
                    name="note"
                    type="text"
                    placeholder={t("rejectionNotePlaceholder")}
                    className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    {t("rejectButton")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">{t("umbrellaAbHeading")}</h2>
        <ul className="text-sm text-dark-slate/70 mb-3 flex flex-col gap-1">
          {umbrellaEntities.map((e) => (
            <li key={e.id}>{e.name} {e.foundationAbOrgNumber && `(${e.foundationAbOrgNumber})`}</li>
          ))}
        </ul>
        <form action={createUmbrellaEntity} className="flex flex-wrap gap-2">
          <input
            name="name"
            type="text"
            placeholder={t("umbrellaAbNamePlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="foundationAbOrgNumber"
            type="text"
            placeholder={t("orgNumberPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            {t("addButton")}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          {t("manualCorrectionHeading")}
        </h2>
        <form action={setLegalTypeDirectly} className="flex flex-wrap items-end gap-2">
          <input
            name="slug"
            type="text"
            placeholder={t("projectSlugPlaceholder")}
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <select
            name="legalType"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {LEGAL_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>{lt.label}</option>
            ))}
          </select>
          <select
            name="umbrellaEntityId"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">{t("umbrellaAbIfApplicableOption")}</option>
            {umbrellaEntities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            {t("setButton")}
          </button>
        </form>
      </section>
    </div>
  );
}
