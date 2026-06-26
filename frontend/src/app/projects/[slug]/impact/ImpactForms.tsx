"use client";

import { useRef, useState, useTransition } from "react";
import { addImpactMetric, updateImpactMetric } from "./actions";

// ---------------------------------------------------------------------------
// AddMetricForm
// ---------------------------------------------------------------------------
export function AddMetricForm({ projectSlug }: { projectSlug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addImpactMetric(projectSlug, fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-coral hover:text-watermelon transition-colors"
      >
        + Lägg till mätvärde
      </button>
    );
  }

  return (
    <div className="border border-muted-teal/40 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark-slate">Nytt mätvärde</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
        >
          Avbryt
        </button>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">Etikett *</label>
            <input
              name="label"
              type="text"
              required
              placeholder="t.ex. Ton plast återvunnet"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">Enhet *</label>
            <input
              name="unit"
              type="text"
              required
              placeholder="t.ex. ton"
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-dark-slate/60 mb-1">Målvärde (valfritt)</label>
          <input
            name="targetValue"
            type="number"
            step="any"
            min="0"
            placeholder="t.ex. 1000"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
        <div>
          <label className="block text-xs text-dark-slate/60 mb-1">Beskrivning (valfritt)</label>
          <input
            name="description"
            type="text"
            placeholder="Kort förklaring av mätvärdet"
            className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Lägg till"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-dark-slate/50 hover:text-dark-slate px-3 py-2 transition-colors"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UpdateMetricForm
// ---------------------------------------------------------------------------
interface UpdateMetricFormProps {
  metricId: string;
  projectSlug: string;
  currentValue: number;
}

export function UpdateMetricForm({ metricId, projectSlug, currentValue }: UpdateMetricFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateImpactMetric(metricId, projectSlug, fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-dark-slate/50 hover:text-coral border border-muted-teal/40 hover:border-coral rounded px-2.5 py-1 transition-colors"
      >
        Uppdatera
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-muted-teal/20 pt-3">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">Nytt värde *</label>
            <input
              name="value"
              type="number"
              step="any"
              required
              placeholder={String(currentValue)}
              className="w-full border border-muted-teal rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-slate/60 mb-1">Anteckning</label>
            <input
              name="note"
              type="text"
              placeholder="Valfri kommentar"
              className="w-full border border-muted-teal rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={pending}
            className="bg-coral text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-watermelon transition-colors disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-dark-slate/40 hover:text-dark-slate transition-colors"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  );
}
