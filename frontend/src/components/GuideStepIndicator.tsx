"use client";

export interface GuideStepDef {
  key: string;
  label: string;
}

export default function GuideStepIndicator({
  steps,
  currentIndex,
  doneKeys,
  onStepClick,
}: {
  steps: GuideStepDef[];
  currentIndex: number;
  doneKeys: Set<string>;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const isDone = doneKeys.has(s.key);
        const isCurrent = i === currentIndex;
        const clickable = !!onStepClick && (isDone || isCurrent);
        return (
          <div key={s.key} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => clickable && onStepClick!(i)}
              disabled={!clickable}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isCurrent ? "text-seagrass" : isDone ? "text-dark-slate/60" : "text-dark-slate/30"
              } ${clickable ? "" : "cursor-default"}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCurrent ? "bg-seagrass text-white" : isDone ? "bg-dry-sage text-dark-slate" : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-muted-teal/30 mx-3" />}
          </div>
        );
      })}
    </div>
  );
}
