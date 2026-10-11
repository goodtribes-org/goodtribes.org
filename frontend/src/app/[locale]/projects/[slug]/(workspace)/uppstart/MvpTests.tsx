"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { MvpSignal } from "@prisma/client";
import { MVP_SIGNAL_ICON, MVP_SIGNALS } from "@/lib/mvp";
import { addMvpTest, deleteMvpTest } from "./actions";

// "Låt dem prova" (#320): one row per person who tried the smallest
// version, with what happened and how strong a signal it was — from "tyckte
// det var bra" to "betalade". No method to learn: write who, pick a signal.
export default function MvpTests({
  slug,
  tests,
  canEdit,
}: {
  slug: string;
  tests: { id: string; who: string; happened: string | null; signal: MvpSignal }[];
  canEdit: boolean;
}) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const [who, setWho] = useState("");
  const [happened, setHappened] = useState("");
  const [signal, setSignal] = useState<MvpSignal | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  const add = () =>
    act(() => addMvpTest(slug, who, happened, signal ?? ""), () => {
      setWho("");
      setHappened("");
      setSignal(null);
    });

  return (
    <div className="flex flex-col gap-4">
      {tests.length > 0 ? (
        <ul className="flex flex-col divide-y divide-muted-teal/15">
          {tests.map((x) => (
            <li key={x.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span className="flex items-start gap-2">
                <span aria-hidden className="text-base leading-5">{MVP_SIGNAL_ICON[x.signal]}</span>
                <span>
                  <span className="font-medium text-dark-slate">{x.who}</span>
                  <span className="text-dark-slate/50"> · {t(`signal_${x.signal}`)}</span>
                  {x.happened && <span className="block whitespace-pre-line text-dark-slate/70">{x.happened}</span>}
                </span>
              </span>
              {canEdit &&
                (confirming === x.id ? (
                  <span className="flex shrink-0 gap-2 text-xs">
                    <button type="button" disabled={pending} onClick={() => act(() => deleteMvpTest(slug, x.id), () => setConfirming(null))} className="font-semibold text-watermelon">
                      {t("confirmDelete")}
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="text-dark-slate/50">
                      {t("cancel")}
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirming(x.id)} className="shrink-0 text-xs text-dark-slate/40 hover:text-watermelon">
                    {t("delete")}
                  </button>
                ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-dark-slate/50">{t("testsEmpty")}</p>
      )}

      {canEdit && (
        <div className="flex flex-col gap-3 rounded-xl border border-muted-teal/30 p-4">
          <h3 className="text-sm font-semibold text-dark-slate">{t("addTestHeading")}</h3>
          <input
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder={t("testWhoPlaceholder")}
            className="rounded-lg border border-muted-teal/40 px-3 py-2 text-sm focus:border-seagrass focus:outline-none"
          />
          <textarea
            value={happened}
            onChange={(e) => setHappened(e.target.value)}
            placeholder={t("testHappenedPlaceholder")}
            rows={2}
            className="rounded-lg border border-muted-teal/40 px-3 py-2 text-sm focus:border-seagrass focus:outline-none"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("testSignalLabel")}>
            {MVP_SIGNALS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={signal === s}
                onClick={() => setSignal(s)}
                className={`rounded-full border px-3 py-1 text-sm ${signal === s ? "border-seagrass bg-seagrass/10 text-dark-slate" : "border-muted-teal/40 text-dark-slate/70 hover:border-seagrass/60"}`}
              >
                {MVP_SIGNAL_ICON[s]} {t(`signal_${s}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={add} disabled={pending || !who.trim() || !signal} className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {pending ? t("saving") : t("addTest")}
            </button>
            {error && <span className="text-xs text-watermelon">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
