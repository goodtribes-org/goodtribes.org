"use client";

import type { SprintPace, SprintPhaseName, SprintPhaseStatus } from "@prisma/client";

const PHASE_LABEL: Record<SprintPhaseName, string> = {
  UNDERSTAND: "Förstå",
  DIVERGE: "Skissa",
  DECIDE: "Besluta",
  PROTOTYPE: "Prototypa",
  VALIDATE: "Testa",
};

function daysLeft(deadline: Date): number {
  const ms = deadline.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export type PhaseRow = {
  id: string | null;
  phase: SprintPhaseName;
  status: SprintPhaseStatus;
  openedAt: string | null;
  deadlineAt: string | null;
  closedAt: string | null;
};

export default function SprintPhaseTabs({
  phases,
  activeTab,
  onSelect,
  pace,
}: {
  phases: PhaseRow[];
  activeTab: SprintPhaseName;
  onSelect: (phase: SprintPhaseName) => void;
  pace: SprintPace;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {phases.map((p, i) => {
        const isActive = p.phase === activeTab;
        const pillClass =
          p.status === "OPEN"
            ? isActive
              ? "bg-seagrass text-white font-bold shadow-sm"
              : "bg-white border border-seagrass/60 text-seagrass/80 hover:border-seagrass hover:text-seagrass"
            : p.status === "CLOSED"
              ? isActive
                ? "bg-dry-sage text-dark-slate font-medium"
                : "bg-white border border-dark-slate/15 text-dark-slate/50 hover:border-dark-slate/30 hover:text-dark-slate/70"
              : "bg-white border border-dark-slate/10 text-dark-slate/30 cursor-not-allowed";

        return (
          <button
            key={p.phase}
            type="button"
            disabled={p.status === "LOCKED"}
            onClick={() => onSelect(p.phase)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${pillClass}`}
          >
            {i + 1}. {PHASE_LABEL[p.phase]}
            {p.status === "OPEN" && pace === "SPREAD_OUT" && p.deadlineAt && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                {(() => {
                  const remaining = daysLeft(new Date(p.deadlineAt));
                  return remaining === 0 ? "Sista dag" : `${remaining} dag${remaining !== 1 ? "ar" : ""} kvar`;
                })()}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
