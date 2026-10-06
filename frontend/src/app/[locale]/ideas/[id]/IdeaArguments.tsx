"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import FlagContentButton from "@/components/FlagContentButton";
import { addIdeaArgument, deleteOwnArgument, toggleArgumentHelpful } from "./actions";

// Same limit as addIdeaArgument (actions.ts).
const MAX_LENGTH = 500;

export type ArgumentRow = { id: string; side: "PRO" | "CON"; text: string; authorName: string | null; helpful: number; markedByMe: boolean; mine: boolean };

// "Vad talar för och emot?" (#236): two columns of short arguments, the most
// helpful first. Anyone logged in adds one, marks others "Hjälpsamt",
// removes their own, or flags one.
export default function IdeaArguments({ ideaId, rows, isLoggedIn }: { ideaId: string; rows: ArgumentRow[]; isLoggedIn: boolean }) {
  const t = useTranslations("IdeaArguments");
  return (
    <section className="mb-8 rounded-xl border border-muted-teal/40 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark-slate">{t("heading")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Column ideaId={ideaId} side="PRO" rows={rows.filter((r) => r.side === "PRO")} isLoggedIn={isLoggedIn} />
        <Column ideaId={ideaId} side="CON" rows={rows.filter((r) => r.side === "CON")} isLoggedIn={isLoggedIn} />
      </div>
    </section>
  );
}

function Column({ ideaId, side, rows, isLoggedIn }: { ideaId: string; side: "PRO" | "CON"; rows: ArgumentRow[]; isLoggedIn: boolean }) {
  const t = useTranslations("IdeaArguments");
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sorted = [...rows].sort((a, b) => b.helpful - a.helpful);

  const add = () =>
    startTransition(async () => {
      setError(null);
      const res = await addIdeaArgument(ideaId, side, text);
      if (res && "error" in res) setError(res.error === "Too long" ? t("tooLong") : t("error"));
      else {
        setText("");
        setOpen(false);
      }
    });

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className={`text-sm font-semibold ${side === "PRO" ? "text-seagrass" : "text-watermelon"}`}>{side === "PRO" ? t("pro") : t("con")}</p>
      {sorted.length === 0 && <p className="text-xs text-dark-slate/40">{t("empty")}</p>}
      {sorted.map((a) => (
        <div key={a.id} className="rounded-lg border border-muted-teal/30 p-3">
          <p className="whitespace-pre-wrap text-sm text-dark-slate/80">{a.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-dark-slate/45">
            {a.authorName && <span>{a.authorName}</span>}
            {isLoggedIn && !a.mine ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { await toggleArgumentHelpful(a.id); })}
                className={a.markedByMe ? "font-semibold text-seagrass" : "hover:text-dark-slate"}
              >
                👍 {t("helpful")} · {a.helpful}
              </button>
            ) : (
              <span>👍 {t("helpful")} · {a.helpful}</span>
            )}
            {a.mine && (
              <button type="button" disabled={pending} onClick={() => startTransition(async () => { await deleteOwnArgument(a.id); })} className="hover:text-watermelon">
                {t("remove")}
              </button>
            )}
            {isLoggedIn && !a.mine && <FlagContentButton targetType="IdeaArgument" targetId={a.id} />}
          </div>
        </div>
      ))}
      {isLoggedIn &&
        (open ? (
          <div className="rounded-lg border border-muted-teal/50 p-2">
            <label htmlFor={`arg-${side}`} className="sr-only">
              {side === "PRO" ? t("addPro") : t("addCon")}
            </label>
            <textarea
              id={`arg-${side}`}
              autoFocus
              rows={3}
              maxLength={MAX_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-md border border-dark-slate/15 px-2 py-1.5 text-sm focus:border-seagrass focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-dark-slate/40">{text.length}/{MAX_LENGTH}</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="text-xs text-dark-slate/50 hover:text-dark-slate">
                  {t("cancel")}
                </button>
                <button type="button" disabled={pending || !text.trim()} onClick={add} className="rounded-full bg-seagrass px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                  {t("publish")}
                </button>
              </span>
            </div>
            {error && <p className="mt-1 text-xs text-watermelon">{error}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-dashed border-muted-teal/60 px-3 py-2 text-left text-xs text-dark-slate/50 hover:border-seagrass hover:text-dark-slate">
            + {side === "PRO" ? t("addPro") : t("addCon")}
          </button>
        ))}
    </div>
  );
}
