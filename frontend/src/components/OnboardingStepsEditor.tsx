"use client";

import { useState, useTransition } from "react";
import { updateOnboardingSteps } from "@/app/[locale]/home-hero-actions";
import type { OnboardingStepData } from "@/components/OnboardingStepsBar";
import type { Locale } from "next-intl";

export default function OnboardingStepsEditor({
  initialSteps,
  locale,
}: {
  initialSteps: OnboardingStepData[];
  locale: Locale;
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(order: number, key: "label" | "href", value: string) {
    setSaved(false);
    setSteps((prev) => prev.map((s) => (s.order === order ? { ...s, [key]: value } : s)));
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateOnboardingSteps(
        steps.map((s) => ({ order: s.order, label: s.label, href: s.href })),
        locale
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.order} className="flex items-center gap-2">
          <span className="w-6 text-sm font-bold text-dark-slate/40 text-right flex-shrink-0">{i + 1}</span>
          <input
            value={s.label}
            onChange={(e) => update(s.order, "label", e.target.value)}
            placeholder="Text"
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <input
            value={s.href}
            onChange={(e) => update(s.order, "href", e.target.value)}
            placeholder="Länk"
            className="w-40 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
        >
          Spara alla steg
        </button>
        {saved && <span className="text-xs text-seagrass">Sparat.</span>}
        {error && <p className="text-xs text-coral">{error}</p>}
      </div>
    </div>
  );
}
