"use client";

import { useState, useTransition } from "react";
import { selfNominate } from "./actions";

export default function SelfNominateButton({ pollId }: { pollId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="text-sm text-green-700 font-medium">Du är nominerad!</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await selfNominate(pollId);
            if (result && "error" in result) setError(result.error ?? "Något gick fel.");
            else setDone(true);
          })
        }
        className="text-sm font-medium px-4 py-2 rounded-md border border-muted-teal text-dark-slate/70 hover:border-seagrass hover:text-seagrass transition-colors"
      >
        {isPending ? "Nominerar…" : "Nominera dig själv"}
      </button>
      {error && <p className="text-sm text-watermelon mt-1">{error}</p>}
    </div>
  );
}
