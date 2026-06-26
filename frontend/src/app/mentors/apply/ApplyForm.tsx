"use client";

import { useState, useTransition } from "react";
import { applyAsMentor } from "../actions";

const CATEGORIES = [
  "Teknik",
  "Produktutveckling",
  "Design & UX",
  "Affärsutveckling",
  "Fundraising",
  "Kommunikation",
  "Juridik",
  "Hälsa",
  "Utbildning",
  "Miljö & Klimat",
  "Samhälle",
  "Data & AI",
];

export default function ApplyForm() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await applyAsMentor(formData);
      if (result?.success) {
        setSuccess(true);
      } else if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="max-w-lg py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-seagrass/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-seagrass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Din ansökan är mottagen</h2>
        <p className="text-dark-slate/70 mb-6">
          Vi granskar din ansökan och återkommer snart. Verifierade mentorer visas på mentorsidan.
        </p>
        <a
          href="/mentors"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors"
        >
          Tillbaka till mentorer
        </a>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6 max-w-lg">
      {error && (
        <p className="text-sm text-watermelon bg-watermelon/10 px-4 py-2 rounded-lg">{error}</p>
      )}

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-dark-slate mb-1">
          Berätta om dig själv <span className="text-watermelon">*</span>
        </label>
        <p className="text-xs text-dark-slate/50 mb-2">
          Vad har du för bakgrund och erfarenhet? Varför vill du bli mentor?
        </p>
        <textarea
          id="bio"
          name="bio"
          rows={6}
          required
          placeholder="Jag har arbetat med... Jag vill hjälpa projekt som..."
          className="w-full border border-muted-teal rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-dark-slate mb-1">
          Kategorier <span className="text-watermelon">*</span>
        </p>
        <p className="text-xs text-dark-slate/50 mb-3">Välj de områden du kan erbjuda mentorskap inom.</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="categories"
                value={cat}
                className="accent-seagrass w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-dark-slate">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-2.5 bg-coral text-white text-sm font-medium rounded-xl hover:bg-watermelon transition-colors disabled:opacity-60"
        >
          {isPending ? "Skickar ansökan…" : "Skicka ansökan"}
        </button>
      </div>
    </form>
  );
}
