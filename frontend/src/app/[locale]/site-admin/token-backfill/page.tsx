import { getBackfillCandidates } from "./actions";
import BackfillPanel from "./BackfillPanel";

export default async function TokenBackfillPage() {
  const { candidates, cappedAt } = await getBackfillCandidates();
  const payable = candidates.filter((c) => c.payees.length > 0);
  const unpayable = candidates.filter((c) => c.payees.length === 0);
  const totalTokens = payable.reduce((sum, c) => sum + c.tokenValue, 0);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Token-bakfyllning</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Klara Kanban-kort (kolumn <code>DONE</code>) i alla projekt som aldrig fick tokens
          utdelade. Kortets prioritetsvärde delas mellan de som bockade av deluppgifter (eller
          går till tilldelad person om kortet saknar deluppgifter); kort utan någon att betala ut
          till hoppas över.
        </p>
      </div>

      {cappedAt && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Visar de {cappedAt} första träffarna — det kan finnas fler. Kör bakfyllningen och ladda om
          sidan för att se om ytterligare kort återstår.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">Kort att betala ut</p>
          <p className="text-2xl font-bold text-dark-slate">{payable.length}</p>
        </div>
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">Tokens att dela ut</p>
          <p className="text-2xl font-bold text-coral">{Math.round(totalTokens)}</p>
        </div>
        <div className="border border-muted-teal/30 rounded-xl p-4">
          <p className="text-xs text-dark-slate/50">Hoppas över (ingen att betala)</p>
          <p className="text-2xl font-bold text-dark-slate/40">{unpayable.length}</p>
        </div>
      </div>

      <BackfillPanel disabled={payable.length === 0} />

      <div className="mt-8 border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15">
        {candidates.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">Inga obetalda klara kort hittades.</p>
        )}
        {candidates.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-slate truncate">{c.title}</p>
              <p className="text-xs text-dark-slate/40">
                {c.project.title} · {c.priority} ·{" "}
                {c.payees.length === 0
                  ? "ingen att betala ut till"
                  : c.payees
                      .map((p) => {
                        const name = p.userId === c.assignee?.id ? c.assignee?.name : null;
                        return `${name ?? p.userId} (${Math.round(p.tokens)})`;
                      })
                      .join(", ")}
              </p>
            </div>
            <span className={`text-xs font-semibold ${c.payees.length > 0 ? "text-coral" : "text-dark-slate/30 line-through"}`}>
              {Math.round(c.tokenValue)} tokens
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
