"use client";

import { useState, useTransition } from "react";
import { updateHeroHeading } from "@/app/[locale]/home-hero-actions";

export default function HeroHeadingEditor({ initialHeading }: { initialHeading: string }) {
  const [heading, setHeading] = useState(initialHeading);
  const [saved, setSaved] = useState(initialHeading);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateHeroHeading(heading);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(heading);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        placeholder="Rubrik ovanför hero-karusellen"
        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || heading === saved}
        className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
      >
        Spara
      </button>
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
