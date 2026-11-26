"use client";

// Coachen (#367) inside the conversation panel: the coach's conversation with
// you, its quick replies and drafts, and how hard it pushes. "Jag vill prata
// med en människa" is always there and takes you to your people in the same
// panel — never "call us".

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CoachLevel } from "@prisma/client";
import { changeCoachLevel, sendToCoach } from "@/app/coach-actions";
import type { CoachState, CoachTurnResult } from "@/lib/coach";

const LEVELS: CoachLevel[] = ["OFF", "CALM", "DIRECT", "PUSHY"];
const ACCENT = "#E8531F";

export function CoachMark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full text-white" style={{ width: size, height: size, background: ACCENT, fontSize: size * 0.45 }} aria-hidden="true">
      ✦
    </span>
  );
}

export default function CoachThread({
  state,
  onState,
  onHuman,
  thinking,
}: {
  state: CoachState;
  onState: (s: CoachState) => void;
  onHuman: () => void;
  /** The coach is taking the initiative right now (opening the panel). */
  thinking: boolean;
}) {
  const t = useTranslations("Coach");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const timeFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages.length, pending, thinking]);

  function handle(res: CoachTurnResult) {
    if (res.ok) {
      onState(res.state);
      setError(null);
    } else setError(t(`error.${res.reason}`));
  }

  function send(body: string) {
    const value = body.trim();
    if (!value || pending) return;
    setText("");
    // Show your words right away; the coach's answer follows.
    onState({ ...state, messages: [...state.messages, { id: `local-${Date.now()}`, role: "USER", body: value, quickReplies: [], draft: null, createdAt: new Date().toISOString() }] });
    startTransition(async () => handle(await sendToCoach(value, locale)));
  }

  function level(l: CoachLevel) {
    startTransition(async () => {
      const s = await changeCoachLevel(l);
      if (s) onState(s);
    });
  }

  const last = state.messages[state.messages.length - 1];
  const offers = last?.role === "COACH" && !pending ? last.quickReplies : [];

  return (
    <>
      {/* Who the coach is, honestly: a role, not a made-up person — and yours to tune */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-[11px] text-dark-slate/60">
        <span className="flex-1">{t("about")}</span>
        <span className="flex items-center gap-0.5 rounded-full bg-[#F3F1EC] p-0.5" role="radiogroup" aria-label={t("levelLabel")}>
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={state.level === l}
              onClick={() => level(l)}
              className={`rounded-full px-2 py-0.5 ${state.level === l ? "bg-white font-bold text-dark-slate shadow-sm" : "hover:text-dark-slate"}`}
            >
              {t(`level.${l}`)}
            </button>
          ))}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {state.messages.length === 0 && !thinking && !pending && <p className="m-0 text-dark-slate/60">{t("empty")}</p>}
        {state.messages.map((m) =>
          m.role === "USER" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <p className="m-0 whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#12486C] px-3 py-2 text-white">{m.body}</p>
                <p className="mt-1 text-right text-[11px] text-dark-slate/50">{timeFmt.format(new Date(m.createdAt))}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-end gap-2">
              <CoachMark size={28} />
              <div className="max-w-[85%]">
                <div className={`rounded-2xl rounded-bl-sm px-3 py-2 ${m === last ? "bg-[#FDEEE7] outline outline-2 outline-[#E8531F]" : "bg-[#F3F1EC]"}`}>
                  <p className="m-0 whitespace-pre-wrap">{m.body}</p>
                  {m.draft && (
                    <div className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] text-dark-slate/80">
                      <p className="m-0 whitespace-pre-wrap">{m.draft}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(m.draft ?? "").then(() => setCopied(m.id)).catch(() => {});
                        }}
                        className="mt-1.5 text-xs font-semibold text-[#C2410C] hover:underline"
                      >
                        {copied === m.id ? t("copied") : t("copy")}
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-dark-slate/50">{timeFmt.format(new Date(m.createdAt))}</p>
              </div>
            </div>
          ),
        )}
        {(pending || thinking) && (
          <div className="flex items-end gap-2">
            <CoachMark size={28} />
            <p className="m-0 rounded-2xl rounded-bl-sm bg-[#F3F1EC] px-3 py-2 text-dark-slate/60">{t("thinking")}</p>
          </div>
        )}
        {error && <p className="m-0 text-xs text-[#B42318]">{error}</p>}

        <div className="flex flex-wrap gap-2 pl-9 text-xs">
          {offers.map((q, i) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className={`rounded-full px-3 py-1.5 ${i === 0 ? "bg-[#E8531F] font-semibold text-white" : "border border-[#E4E4DF] hover:bg-[#F6F6F3]"}`}
            >
              {q}
            </button>
          ))}
          {/* Always here: a person, in the same panel */}
          <button type="button" onClick={onHuman} className="rounded-full border border-[#E4E4DF] px-3 py-1.5 hover:bg-[#F6F6F3]">
            {t("human")}
          </button>
        </div>
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex gap-2 border-t border-[#E4E4DF] p-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full bg-[#F3F1EC] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E8531F]/40"
        />
        <button type="submit" disabled={pending || !text.trim()} className="rounded-full bg-[#253331] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {t("send")}
        </button>
      </form>
    </>
  );
}
