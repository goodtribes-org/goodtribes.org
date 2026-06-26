"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createPoll } from "../actions";

interface OptionField {
  label: string;
  description: string;
}

const MAX_OPTIONS = 8;

export default function NewPollForm({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();
  const [pollType, setPollType] = useState<"yes_no" | "multiple">("yes_no");
  const [options, setOptions] = useState<OptionField[]>([
    { label: "", description: "" },
    { label: "", description: "" },
  ]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createPoll(formData, slug);
    });
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { label: "", description: "" }]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, field: keyof OptionField, value: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-dark-slate mb-1">
          Rubrik <span className="text-watermelon">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Vad ska ni rösta om?"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-dark-slate mb-1">
          Beskrivning <span className="text-dark-slate/40 font-normal">(valfritt)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Ge mer bakgrund om omröstningen…"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
        />
      </div>

      {/* Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-dark-slate mb-1">
          Typ
        </label>
        <select
          id="type"
          name="type"
          value={pollType}
          onChange={(e) => setPollType(e.target.value as "yes_no" | "multiple")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
        >
          <option value="yes_no">Ja / Nej</option>
          <option value="multiple">Flerval</option>
        </select>
      </div>

      {/* Dynamic options — only for multiple */}
      {pollType === "multiple" && (
        <div>
          <p className="block text-sm font-medium text-dark-slate mb-2">
            Alternativ <span className="text-watermelon">*</span>
          </p>
          <div className="flex flex-col gap-3">
            {options.map((opt, i) => (
              <div key={i} className="border border-muted-teal rounded-md p-3 bg-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-dark-slate/50 w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <input
                    name={`option_label_${i}`}
                    type="text"
                    required
                    value={opt.label}
                    onChange={(e) => updateOption(i, "label", e.target.value)}
                    placeholder="Alternativets namn"
                    className="flex-1 border border-muted-teal rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-dark-slate/30 hover:text-watermelon text-sm px-1"
                      aria-label="Ta bort alternativ"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="pl-7">
                  <input
                    name={`option_description_${i}`}
                    type="text"
                    value={opt.description}
                    onChange={(e) => updateOption(i, "description", e.target.value)}
                    placeholder="Kort beskrivning (valfritt)"
                    className="w-full border border-muted-teal rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent text-dark-slate/70"
                  />
                </div>
              </div>
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-seagrass hover:text-coral transition-colors"
            >
              + Lägg till alternativ
            </button>
          )}
        </div>
      )}

      {/* Visibility */}
      <div>
        <label htmlFor="visibility" className="block text-sm font-medium text-dark-slate mb-1">
          Synlighet
        </label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="live"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
        >
          <option value="live">Öppen — resultatet syns direkt</option>
          <option value="hidden">Dold — resultatet visas efter stängning</option>
        </select>
      </div>

      {/* isBinding */}
      <div className="flex items-center gap-2">
        <input
          id="isBinding"
          name="isBinding"
          type="checkbox"
          className="w-4 h-4 border-muted-teal rounded accent-coral"
        />
        <label htmlFor="isBinding" className="text-sm font-medium text-dark-slate">
          Bindande beslut
        </label>
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="deadline" className="block text-sm font-medium text-dark-slate mb-1">
          Sista röstningsdag <span className="text-dark-slate/40 font-normal">(valfritt)</span>
        </label>
        <input
          id="deadline"
          name="deadline"
          type="datetime-local"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent bg-white"
        />
      </div>

      {/* Quorum */}
      <div>
        <label htmlFor="quorumPercent" className="block text-sm font-medium text-dark-slate mb-1">
          Minsta deltagande %{" "}
          <span className="text-dark-slate/40 font-normal">(valfritt, 0–100)</span>
        </label>
        <input
          id="quorumPercent"
          name="quorumPercent"
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder="t.ex. 50"
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-coral text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skapar…" : "Skapa omröstning"}
        </button>
        <Link
          href={`/projects/${slug}/polls`}
          className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
