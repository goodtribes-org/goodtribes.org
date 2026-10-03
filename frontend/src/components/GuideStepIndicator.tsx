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
    // Scrolls horizontally instead of compressing steps below their label's
    // natural width — with 7-8 steps (this app's guides now regularly have
    // that many, since the Fas 1-6 restructuring), flex-shrinking every step
    // to fit one line made labels overlap each other rather than wrap or
    // clip. shrink-0 on each step keeps its full label intact; overflow-x-auto
    // lets the row scroll instead, same pattern as ProjectTopNav's tab bar.
    // An ordered list for screen readers: the current step is aria-current,
    // and a step that can't be clicked is plain text rather than a disabled
    // button. On a phone the label is visually hidden but still read out.
    <ol className="m-0 flex list-none items-center gap-0 p-0 mb-8 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
      {steps.map((s, i) => {
        const isDone = doneKeys.has(s.key);
        const isCurrent = i === currentIndex;
        // Every step is freely navigable, done or not — the guide doesn't
        // have to be followed in order.
        const clickable = !!onStepClick;
        const className = `flex items-center gap-2 text-sm font-medium transition-colors shrink-0 ${
          isCurrent ? "text-seagrass" : isDone ? "text-dark-slate/60" : "text-dark-slate/30"
        }`;
        const content = (
          <>
            <span
              aria-hidden
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isCurrent ? "bg-seagrass text-white" : isDone ? "bg-dry-sage text-dark-slate" : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span className="sr-only sm:not-sr-only whitespace-nowrap">
              <span className="sr-only">{i + 1}. </span>
              {s.label}
            </span>
          </>
        );
        return (
          <li key={s.key} className="flex items-center shrink-0" aria-current={isCurrent ? "step" : undefined}>
            {clickable ? (
              <button type="button" onClick={() => onStepClick!(i)} className={className}>
                {content}
              </button>
            ) : (
              <span className={className}>{content}</span>
            )}
            {i < steps.length - 1 && <div aria-hidden className="w-8 shrink-0 h-px bg-muted-teal/30 mx-3" />}
          </li>
        );
      })}
    </ol>
  );
}
