"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem } from "./(workspace)/edit/actions";
import { dismissProjectChecklist } from "@/lib/tourActions";
import { INITIATIVE_CHECKLIST_ITEMS, PROJECT_PHASE_LABEL } from "@/lib/projectPhase";

export default function GettingStartedChecklist({
  projectId,
  slug,
  phase,
  completedKeys,
}: {
  projectId: string;
  slug: string;
  phase: "IDEA" | "PROJECT";
  completedKeys: string[];
}) {
  const [dismissed, setDismissed] = useState(false);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set(completedKeys));
  const [isPending, startTransition] = useTransition();

  const items = INITIATIVE_CHECKLIST_ITEMS[phase];
  const allDone = items.every((item) => doneKeys.has(item.key));

  if (dismissed || allDone) return null;

  function handleToggle(itemKey: string, done: boolean) {
    setDoneKeys((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemKey);
      else next.delete(itemKey);
      return next;
    });
    startTransition(() => toggleChecklistItem(slug, phase, itemKey, done));
  }

  function handleDismiss() {
    setDismissed(true);
    dismissProjectChecklist(projectId);
  }

  return (
    <div className="mb-8 border border-seagrass/30 bg-seagrass/5 rounded-xl p-6 relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-xs text-dark-slate/40 hover:text-dark-slate/70"
      >
        Dölj
      </button>
      <h2 className="font-semibold text-dark-slate mb-1">Ditt projekt är skapat 🎉</h2>
      <p className="text-sm text-dark-slate/50 mb-5">
        Här är dina första steg för fasen &quot;{PROJECT_PHASE_LABEL[phase]}&quot;.
      </p>
      <ol className="space-y-3">
        {items.map((item, i) => {
          const done = doneKeys.has(item.key);
          return (
            <li key={item.key} className="flex items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(item.key, !done)}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  done ? "bg-seagrass text-white" : "border-2 border-muted-teal/40 text-dark-slate/30"
                }`}
              >
                {done ? "✓" : i + 1}
              </button>
              <span className={`text-sm ${done ? "text-dark-slate/40 line-through" : "text-dark-slate"}`}>
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
