import { prisma } from "@/lib/prisma";
import { LEGAL_TYPES, LEGAL_TYPE_LABEL } from "@/lib/legalType";
import {
  executeLegalTypeChange,
  rejectLegalTypeChange,
  createUmbrellaEntity,
  setLegalTypeDirectly,
} from "./actions";

export default async function LegalTypeAdminPage() {
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
        <h1 className="text-2xl font-bold text-dark-slate">Juridisk form</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Genomför medlemsgodkända övergångar (PRD 4c). Ett godkänt röstresultat är en begäran — inte en automatisk
          ändring.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Väntar på Stiftelsens beslut ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga väntande begäranden.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingRequests.map((r) => (
              <div key={r.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
                <p className="font-semibold text-dark-slate">{r.project.title}</p>
                <p className="text-sm text-dark-slate/60 mb-3">
                  Begär byte till <strong>{LEGAL_TYPE_LABEL[r.requestedType] ?? r.requestedType}</strong>
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
                      <option value="">— välj paraply-AB —</option>
                      {umbrellaEntities.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-coral text-white text-xs font-medium hover:bg-watermelon transition-colors"
                  >
                    Genomför övergång
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
                    placeholder="Motivering för avslag…"
                    className="flex-1 min-w-40 border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    Avslå
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">Paraply-AB</h2>
        <ul className="text-sm text-dark-slate/70 mb-3 flex flex-col gap-1">
          {umbrellaEntities.map((e) => (
            <li key={e.id}>{e.name} {e.foundationAbOrgNumber && `(${e.foundationAbOrgNumber})`}</li>
          ))}
        </ul>
        <form action={createUmbrellaEntity} className="flex flex-wrap gap-2">
          <input
            name="name"
            type="text"
            placeholder="Namn, t.ex. GoodTribes Ventures AB"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <input
            name="foundationAbOrgNumber"
            type="text"
            placeholder="Org.nummer (valfritt)"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            Lägg till
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Manuell rättning (utan omröstning)
        </h2>
        <form action={setLegalTypeDirectly} className="flex flex-wrap items-end gap-2">
          <input
            name="slug"
            type="text"
            placeholder="Projektets slug"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <select
            name="legalType"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            {LEGAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            name="umbrellaEntityId"
            className="border border-muted-teal rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="">— paraply-AB om tillämpligt —</option>
            {umbrellaEntities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-1.5 rounded border border-muted-teal/50 text-xs font-medium text-dark-slate/70 hover:border-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            Sätt
          </button>
        </form>
      </section>
    </div>
  );
}
