"use client";

interface StreakBadgeProps {
  currentWeeks: number;
  longestWeeks: number;
}

export default function StreakBadge({ currentWeeks, longestWeeks }: StreakBadgeProps) {
  if (currentWeeks === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-dark-slate/50">
        Ingen streak ännu
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-dark-slate">
      <span className="text-base" aria-hidden="true">&#128293;</span>
      <span className="font-bold text-coral">{currentWeeks}</span>
      <span>veckor i rad</span>
      {longestWeeks > currentWeeks && (
        <span className="text-xs text-dark-slate/40 ml-1">
          (bäst: {longestWeeks})
        </span>
      )}
    </span>
  );
}
