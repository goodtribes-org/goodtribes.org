"use client";

import { useRef, useState, useTransition } from "react";
import { createSuggestion } from "./actions";

export default function SuggestionForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value ?? "";
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createSuggestion(body);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (textRef.current) textRef.current.value = "";
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-muted-teal/40 bg-white p-4 flex flex-col gap-3">
      <textarea
        ref={textRef}
        rows={4}
        placeholder="Vad skulle du vilja se förbättras på GoodTribes?"
        className="w-full border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
      />
      {error && <p className="text-xs text-watermelon">{error}</p>}
      {sent && <p className="text-xs text-seagrass">Tack för ditt förslag!</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors disabled:opacity-50"
        >
          {pending ? "Skickar..." : "Skicka förslag"}
        </button>
      </div>
    </form>
  );
}
