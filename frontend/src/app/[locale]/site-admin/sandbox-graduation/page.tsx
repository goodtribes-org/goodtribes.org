import { prisma } from "@/lib/prisma";
import { isCommercialLegalType } from "@/lib/legalType";
import { approveSandboxGraduation, rejectSandboxGraduation } from "./actions";

export default async function SandboxGraduationAdminPage() {
  const [pendingRequests, umbrellaEntities] = await Promise.all([
    prisma.sandboxGraduationRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { project: { select: { title: true, slug: true, legalType: true } } },
    }),
    prisma.commercialUmbrellaEntity.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Sandbox-ansökningar</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Ansökningar om att lämna Sandbox och bli ett GoodTribes-godkänt projekt. För kommersiella projekt tilldelas
          samtidigt ett paraply-AB och fakturering låses upp.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-3">
          Väntar på Stiftelsens beslut ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga väntande ansökningar.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingRequests.map((r) => {
              const isCommercial = isCommercialLegalType(r.project.legalType);
              return (
                <div key={r.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
                  <p className="font-semibold text-dark-slate">{r.project.title}</p>
                  <p className="text-sm text-dark-slate/60 mb-3">
                    {isCommercial ? "Kommersiellt — kräver paraply-AB innan godkännande" : "Ideellt"}
                  </p>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await approveSandboxGraduation(r.id, (formData.get("umbrellaEntityId") as string) || undefined);
                    }}
                    className="flex flex-wrap items-end gap-2 mb-2"
                  >
                    {isCommercial && (
                      <select
                        name="umbrellaEntityId"
                        required
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
                      Godkänn
                    </button>
                  </form>

                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await rejectSandboxGraduation(r.id, (formData.get("note") as string) ?? "");
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
