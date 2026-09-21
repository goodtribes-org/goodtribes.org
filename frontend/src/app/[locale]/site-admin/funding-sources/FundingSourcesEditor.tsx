"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFundingSource, archiveFundingSource, reactivateFundingSource } from "./actions";
import { LEGAL_TYPES } from "@/lib/legalType";
import type { FundingSource, FundingSourceCategory, LegalType } from "@prisma/client";

const CATEGORY_OPTIONS: { value: FundingSourceCategory; label: string }[] = [
  { value: "FOUNDATION", label: "Stiftelse" },
  { value: "GOVERNMENT_GRANT", label: "Myndighetsbidrag" },
  { value: "EU_PROGRAM", label: "EU-program" },
  { value: "CORPORATE_CSR", label: "Företags-CSR" },
  { value: "OTHER", label: "Annat" },
];

const SDG_COUNT = 17;

export default function FundingSourcesEditor({ initialSources }: { initialSources: FundingSource[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSdgs, setSelectedSdgs] = useState<Set<number>>(new Set());
  const [selectedLegalTypes, setSelectedLegalTypes] = useState<Set<LegalType>>(new Set());

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const tags = (fd.get("tags") as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await createFundingSource({
          name: fd.get("name") as string,
          organization: (fd.get("organization") as string) ?? "",
          description: (fd.get("description") as string) ?? "",
          category: fd.get("category") as FundingSourceCategory,
          sdgGoals: Array.from(selectedSdgs),
          eligibleLegalTypes: Array.from(selectedLegalTypes),
          tags,
          minAmountSek: fd.get("minAmountSek") ? parseInt(fd.get("minAmountSek") as string, 10) : null,
          maxAmountSek: fd.get("maxAmountSek") ? parseInt(fd.get("maxAmountSek") as string, 10) : null,
          applicationUrl: (fd.get("applicationUrl") as string) ?? "",
          requiresBankId: fd.get("requiresBankId") === "on",
          region: (fd.get("region") as string) ?? "",
          rollingDeadline: fd.get("rollingDeadline") === "on",
          nextDeadline: (fd.get("nextDeadline") as string) || null,
        });
        (e.target as HTMLFormElement).reset();
        setSelectedSdgs(new Set());
        setSelectedLegalTypes(new Set());
        setShowForm(false);
        router.refresh();
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
      >
        {showForm ? "Avbryt" : "+ Lägg till finansieringskälla"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-muted-teal/40 rounded-lg p-4 bg-white space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Namn</label>
              <input name="name" required className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Organisation</label>
              <input name="organization" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Kategori</label>
              <select name="category" defaultValue="OTHER" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm bg-white">
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Beskrivning</label>
              <textarea name="description" rows={2} className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Min. belopp (kr)</label>
              <input name="minAmountSek" type="number" min="0" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Max. belopp (kr)</label>
              <input name="maxAmountSek" type="number" min="0" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Ansökningslänk</label>
              <input name="applicationUrl" type="url" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Region (valfritt)</label>
              <input name="region" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Nästa deadline (valfritt)</label>
              <input name="nextDeadline" type="date" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Taggar (kommaseparerat)</label>
              <input name="tags" placeholder="t.ex. digitalisering, ungdom" className="w-full border border-muted-teal/60 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-dark-slate/70">
                <input name="requiresBankId" type="checkbox" defaultChecked /> Kräver BankID-portal (ingen API-integration)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-dark-slate/70">
                <input name="rollingDeadline" type="checkbox" /> Löpande ansökan
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">SDG-mål (tomt = alla)</label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: SDG_COUNT }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggle(selectedSdgs, n, setSelectedSdgs)}
                    className={`w-7 h-7 rounded text-xs font-medium ${selectedSdgs.has(n) ? "bg-coral text-white" : "bg-dry-sage/20 text-dark-slate/60"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark-slate/60 mb-1">Juridisk form (tomt = alla)</label>
              <div className="flex flex-wrap gap-2">
                {LEGAL_TYPES.map((lt) => (
                  <label key={lt.value} className="flex items-center gap-1.5 text-xs text-dark-slate/70">
                    <input
                      type="checkbox"
                      checked={selectedLegalTypes.has(lt.value)}
                      onChange={() => toggle(selectedLegalTypes, lt.value, setSelectedLegalTypes)}
                    />
                    {lt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {isPending ? "Sparar…" : "Spara"}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {initialSources.map((s) => (
          <div key={s.id} className={`border border-muted-teal/40 rounded-lg p-4 bg-white ${s.status === "ARCHIVED" ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-dark-slate">{s.name}</p>
                <p className="text-xs text-dark-slate/40 mt-0.5">
                  {CATEGORY_OPTIONS.find((c) => c.value === s.category)?.label ?? s.category}
                  {s.organization ? ` · ${s.organization}` : ""}
                  {s.sdgGoals.length > 0 ? ` · SDG ${s.sdgGoals.join(", ")}` : ""}
                </p>
                {s.description && <p className="text-sm text-dark-slate/60 mt-1">{s.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => startTransition(async () => {
                  if (s.status === "ACTIVE") await archiveFundingSource(s.id);
                  else await reactivateFundingSource(s.id);
                  router.refresh();
                })}
                disabled={isPending}
                className="shrink-0 text-xs font-medium text-dark-slate/40 hover:text-dark-slate transition-colors disabled:opacity-50"
              >
                {s.status === "ACTIVE" ? "Arkivera" : "Återaktivera"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
