"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Card } from "@/components/kanbanShared";
import { chooseOffer, declineOffer, listOffers, saveFirstTask, type OfferView } from "@/app/[locale]/projects/[slug]/first-task-actions";

// In the card editor, for a project's leads (#277): how an open card reads to
// someone from outside — why, how long, where, and whether the leads choose
// among sign-ups (with a question and a cap) — and, when they choose, the
// sign-ups to pick from. Tokens are the card's own, unchanged.

const TIMES = ["MIN15", "HOUR1", "HOURS2_4", "RECURRING"] as const;

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-dark-slate bg-dark-slate text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
      {children}
    </button>
  );
}

function Offers({ cardId, onChosen }: { cardId: string; onChosen: (offer: OfferView) => void }) {
  const t = useTranslations("FirstTasks");
  const [offers, setOffers] = useState<OfferView[] | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    listOffers(cardId).then((r) => setOffers(Array.isArray(r) ? r : []));
  }, [cardId]);
  if (offers === null) return null;
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t("offersHeading", { count: offers.length })}</p>
      {offers.length === 0 && <p className="mt-1 text-xs text-gray-500">{t("noOffers")}</p>}
      <ul className="mt-2 space-y-2">
        {offers.map((o) => (
          <li key={o.id} className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-800">{o.name ?? t("noName")}</p>
            <p className="text-[11px] text-gray-500">
              {o.record && o.record.tasksDone > 0 ? t("record", { tasks: o.record.tasksDone, projects: o.record.projects }) : t("recordNew")}
              {o.record && o.record.thanked > 0 && <> · {t("recordThanked", { count: o.record.thanked })}</>}
            </p>
            {o.answer && <p className="mt-1.5 rounded-md bg-gray-50 p-2 text-sm text-gray-700">”{o.answer}”</p>}
            {o.message && <p className="mt-1 text-xs text-gray-600">{o.message}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { const r = await chooseOffer(o.id); if ("ok" in r) onChosen(o); })}
                className="rounded-full bg-coral px-3 py-1 text-xs font-bold text-white hover:bg-coral/90 disabled:opacity-50"
              >
                {t("choose", { name: o.name?.split(" ")[0] ?? t("noName") })}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { const r = await declineOffer(o.id); if ("ok" in r) setOffers((list) => list?.filter((x) => x.id !== o.id) ?? null); })}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-300 disabled:opacity-50"
              >
                {t("decline")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FirstTaskEditor({ card, onSaved }: { card: Card; onSaved: (patch: Partial<Card>) => void }) {
  const t = useTranslations("FirstTasks");
  const router = useRouter();
  const [why, setWhy] = useState(card.firstTaskWhy ?? "");
  const [time, setTime] = useState<string | null>(card.firstTaskTime ?? null);
  const [remote, setRemote] = useState(!card.firstTaskPlace);
  const [place, setPlace] = useState(card.firstTaskPlace ?? "");
  const [choose, setChoose] = useState(!!card.firstTaskChoose);
  const [question, setQuestion] = useState(card.firstTaskQuestion ?? "");
  const [max, setMax] = useState<number | null>(card.firstTaskMaxOffers ?? null);
  const [saved, setSaved] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    const fields = { why, time, place: remote ? null : place, choose, question, maxOffers: max };
    startTransition(async () => {
      const r = await saveFirstTask(card.id, true, fields);
      if ("ok" in r) {
        setSaved(true);
        onSaved({
          firstTaskWhy: why.trim() || null, firstTaskTime: time, firstTaskPlace: remote ? null : place.trim() || null,
          firstTaskChoose: choose, firstTaskQuestion: choose ? question.trim() || null : null, firstTaskMaxOffers: choose ? max : null,
        });
      }
    });
  }

  return (
    <div className="col-span-2 rounded-lg border border-seagrass/30 bg-seagrass/5 p-3 text-sm">
      <p className="font-semibold text-dark-slate">{t("editHeading")}</p>
      <p className="mb-2 text-xs text-gray-500">{t("editHelp")}</p>
      <div className="space-y-2.5">
        <label className="block">
          <span className="text-xs text-gray-500">{t("whyLabel")}</span>
          <input value={why} onChange={(e) => { setWhy(e.target.value); setSaved(false); }} placeholder={t("whyPlaceholder")} maxLength={500} className="mt-0.5 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm" />
        </label>
        <div>
          <span className="text-xs text-gray-500">{t("timeLabel")}</span>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {TIMES.map((x) => <Pill key={x} on={time === x} onClick={() => { setTime(time === x ? null : x); setSaved(false); }}>{t(`time_${x}`)}</Pill>)}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("placeLabel")}</span>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Pill on={remote} onClick={() => { setRemote(true); setSaved(false); }}>{t("placeRemote")}</Pill>
            <Pill on={!remote} onClick={() => { setRemote(false); setSaved(false); }}>{t("placeAt")}</Pill>
            {!remote && <input value={place} onChange={(e) => { setPlace(e.target.value); setSaved(false); }} placeholder={t("placePlaceholder")} maxLength={120} className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm" />}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500">{t("whoLabel")}</span>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            <Pill on={!choose} onClick={() => { setChoose(false); setSaved(false); }}>{t("whoAnyone")}</Pill>
            <Pill on={choose} onClick={() => { setChoose(true); setSaved(false); }}>{t("whoChoose")}</Pill>
          </div>
        </div>
        {choose && (
          <>
            <label className="block">
              <span className="text-xs text-gray-500">{t("questionEditLabel")}</span>
              <input value={question} onChange={(e) => { setQuestion(e.target.value); setSaved(false); }} maxLength={300} className="mt-0.5 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm" />
            </label>
            <div>
              <span className="text-xs text-gray-500">{t("maxLabel")}</span>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {[null, 1, 3, 5].map((n) => <Pill key={String(n)} on={max === n} onClick={() => { setMax(n); setSaved(false); }}>{n ?? t("maxNone")}</Pill>)}
              </div>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-md bg-seagrass px-3 py-1 text-xs font-semibold text-white hover:bg-seagrass/90 disabled:opacity-50">{t("save")}</button>
          {saved && <span className="text-xs text-seagrass">✓ {t("saved")}</span>}
        </div>
      </div>
      {chosen !== null ? (
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm font-semibold text-seagrass">✓ {t("chosenDone", { name: chosen })}</p>
      ) : card.firstTaskChoose && !card.assigneeId && (
        <Offers
          cardId={card.id}
          onChosen={(o) => {
            setChosen(o.name ?? t("noName"));
            onSaved({ assigneeId: o.userId, assignee: { id: o.userId, name: o.name, image: o.image }, claimedAt: new Date().toISOString() });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
