import { prisma } from "@/lib/prisma";
import { reviewSuggestion } from "./actions";

export default async function SuggestionsAdminPage() {
  const suggestions = await prisma.suggestion.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, email: true } } },
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Förbättringsförslag</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Förslag från användare. {suggestions.length} avvaktar granskning.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="border border-muted-teal/30 rounded-lg p-8 text-center text-dark-slate/50">
          Inga förslag att granska.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {suggestions.map((s) => (
            <div key={s.id} className="border border-muted-teal/40 rounded-lg p-5 bg-white">
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm text-dark-slate whitespace-pre-wrap">{s.body}</p>
                <span className="shrink-0 text-xs text-dark-slate/40">{s.createdAt.toLocaleDateString("sv-SE")}</span>
              </div>
              <p className="text-xs text-dark-slate/50 mb-4">
                Från <span className="font-medium text-dark-slate/70">{s.author.name ?? s.author.email}</span>
              </p>

              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    await reviewSuggestion(s.id, "dismissed");
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
                    await reviewSuggestion(s.id, "reviewed");
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded border border-seagrass/50 text-xs font-medium text-seagrass hover:bg-seagrass/10 transition-colors"
                  >
                    Markera granskad
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
