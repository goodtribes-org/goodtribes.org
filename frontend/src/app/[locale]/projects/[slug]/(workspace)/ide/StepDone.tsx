"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setStepDone } from "./actions";

// "Klar", at the bottom of each Idé step, at the right of the step's action
// row (StepActions) — so it renders row items: the button in the last
// column, and anything longer (the tasks checkbox, a note) on a full line. Marks the step done
// everywhere it shows (header bar, step status, phase gate, guide) and, with
// the box ticked, moves the step's open tasks to Done on the board. Done
// steps show "Steget är klart" with an Ångra.
// `auto`: done because the work itself shows it (e.g. every impact model
// field filled), not by a click — there's nothing to undo then.
export default function StepDone({ slug, stepKey, done, auto, openCards }: { slug: string; stepKey: string; done: boolean; auto: boolean; openCards: number }) {
  const t = useTranslations("StepDone");
  const router = useRouter();
  const [moveCards, setMoveCards] = useState(true);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function set(next: boolean) {
    setNote(null);
    startTransition(async () => {
      const res = await setStepDone(slug, stepKey, next, next && moveCards && openCards > 0);
      if ("error" in res) {
        setNote({ text: res.error, error: true });
        return;
      }
      if (res.notMoved.length > 0) setNote({ text: t("notMoved", { titles: res.notMoved.join(", ") }), error: true });
      else if (res.moved > 0) setNote({ text: t("moved", { count: res.moved }), error: false });
      router.refresh();
    });
  }

  if (done) {
    return (
      <>
        <span className="col-start-3 flex items-center justify-self-end gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-seagrass/10 px-4 py-2 text-sm font-semibold text-seagrass">
          <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-seagrass text-[11px] text-white">✓</span>
          {t("isDone")}
        </p>
        {!auto && (
          <button type="button" onClick={() => set(false)} disabled={pending} className="text-xs text-dark-slate/50 hover:text-dark-slate">
            {t("undo")}
          </button>
        )}
        </span>
        {note && <p className={`col-span-3 text-center text-xs ${note.error ? "text-watermelon" : "text-dark-slate/60"}`}>{note.text}</p>}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => set(true)}
        disabled={pending}
        className="col-start-3 inline-flex items-center gap-2 justify-self-end rounded-full bg-seagrass px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60"
      >
        <span aria-hidden>✓</span>
        {pending ? t("saving") : t("markDone")}
      </button>
      {openCards > 0 && (
        <label className="flex col-span-3 items-center justify-center gap-2 text-xs text-dark-slate/65">
          <input type="checkbox" checked={moveCards} onChange={(e) => setMoveCards(e.target.checked)} className="accent-seagrass" />
          {t("alsoCards", { count: openCards })}
        </label>
      )}
      {note && <p className={`col-span-3 text-center text-xs ${note.error ? "text-watermelon" : "text-dark-slate/60"}`}>{note.text}</p>}
    </>
  );
}

// The row under a step: its AI button in the middle, "Klar" at the right.
export function StepActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">{children}</div>;
}
