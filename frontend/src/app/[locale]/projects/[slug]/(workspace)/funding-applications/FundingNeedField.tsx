"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEstimatedFundingNeed } from "./actions";

export default function FundingNeedField({
  projectSlug,
  initialValue,
}: {
  projectSlug: string;
  initialValue: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    const amount = value.trim() ? parseInt(value, 10) : null;
    if (amount === initialValue) return;
    startTransition(async () => {
      await setEstimatedFundingNeed(projectSlug, isNaN(amount as number) ? null : amount);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 mb-6 text-sm">
      <label className="text-dark-slate/60">Uppskattat finansieringsbehov (kr, valfritt):</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        className="w-32 border border-muted-teal/60 rounded-md px-2 py-1 text-sm disabled:opacity-50"
      />
    </div>
  );
}
