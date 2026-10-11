"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ImpactDraftKind } from "@/lib/impactDrafts";
import { saveImpactFollowup, shareStoryWithContributors, suggestImpact } from "./actions";

const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const primary = "rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
const aiBox = "mx-auto mt-6 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4";
const aiButton = "inline-flex items-center gap-2 self-center rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-seagrass/90 disabled:opacity-60";

function useAct() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  return { act, error, pending };
}

// The story before one is saved: an empty field, and "Fyll i från
// projektets siffror" puts the project's own figures in it to start from.
// Nothing is saved until the team has written it — a bare template never
// counts as a story.
export function StoryStart({ slug, template }: { slug: string; template: string }) {
  const t = useTranslations("ImpactOverview");
  const [text, setText] = useState("");
  const { act, error, pending } = useAct();
  return (
    <div className="flex flex-col gap-3">
      {!text && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-muted-teal/30 bg-dry-sage/10 p-4 text-center">
          <p className="text-sm text-dark-slate/70">{t("storyFromNumbersIntro")}</p>
          <button type="button" onClick={() => setText(template)} className={primary}>
            {t("storyFromNumbers")}
          </button>
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("storyLabel")}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder={t("storyPlaceholder")} className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || !text.trim() || text === template} onClick={() => act(() => saveImpactFollowup(slug, { story: text }))} className={`${primary} self-start`}>
          {pending ? t("saving") : t("save")}
        </button>
        {text === template && <span className="text-xs text-dark-slate/50">{t("storyFillIn")}</span>}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}

// "En röst": a quote, who said it, and their consent — shown nowhere
// without the box ticked.
export function VoiceForm({ slug, quote, who, consent, canEdit }: { slug: string; quote: string | null; who: string | null; consent: boolean; canEdit: boolean }) {
  const t = useTranslations("ImpactOverview");
  const [q, setQ] = useState(quote ?? "");
  const [w, setW] = useState(who ?? "");
  const [c, setC] = useState(consent);
  const { act, error, pending } = useAct();
  if (!canEdit) {
    return quote && consent ? (
      <blockquote className="border-l-4 border-seagrass/50 pl-4 text-base italic text-dark-slate/85">
        ”{quote}”{who && <span className="mt-1 block text-sm not-italic text-dark-slate/60">— {who}</span>}
      </blockquote>
    ) : (
      <p className="text-sm text-dark-slate/50">{t("voiceEmpty")}</p>
    );
  }
  const dirty = q !== (quote ?? "") || w !== (who ?? "") || c !== consent;
  return (
    <div className="flex flex-col gap-3">
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3} placeholder={t("voiceQuotePlaceholder")} className={input} />
      <input value={w} onChange={(e) => setW(e.target.value)} placeholder={t("voiceWhoPlaceholder")} className={input} />
      <label className="flex items-start gap-2 text-sm text-dark-slate/80">
        <input type="checkbox" checked={c} onChange={(e) => setC(e.target.checked)} className="mt-0.5" />
        {t("voiceConsent")}
      </label>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || !dirty} onClick={() => act(() => saveImpactFollowup(slug, { voiceQuote: q, voiceWho: w, voiceConsent: c ? "1" : "" }))} className={`${primary} self-start`}>
          {pending ? t("saving") : t("save")}
        </button>
        {q.trim() && !c && <span className="text-xs text-amber-700">{t("voiceNeedsConsent")}</span>}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}

// "Det här gjorde ni möjligt": one click, once.
export function ShareStory({ slug, sharedOn, hasStory, contributors }: { slug: string; sharedOn: string | null; hasStory: boolean; contributors: number }) {
  const t = useTranslations("ImpactOverview");
  const [sent, setSent] = useState<number | null>(null);
  const { act, error, pending } = useAct();
  if (sharedOn) return <p className="text-sm text-seagrass">✓ {t("sharedOn", { date: sharedOn })}</p>;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || !hasStory || contributors === 0}
        onClick={() =>
          act(async () => {
            const res = await shareStoryWithContributors(slug);
            if (res.sent !== undefined) setSent(res.sent);
            return res;
          })
        }
        className={`${primary} self-start`}
      >
        💚 {pending ? t("saving") : t("shareButton", { count: contributors })}
      </button>
      {!hasStory && <span className="text-xs text-dark-slate/50">{t("shareNeedsStory")}</span>}
      {sent !== null && <span className="text-xs text-seagrass">{t("shareSent", { count: sent })}</span>}
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </div>
  );
}

// "Föreslå med AI" for the story or the lessons: a draft first, saved only
// into an empty field.
export function ImpactAiHelp({ slug, kind, field }: { slug: string; kind: ImpactDraftKind; field: "story" | "celebrationNotes" }) {
  const t = useTranslations("ImpactOverview");
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { act, pending: saving, error: saveError } = useAct();
  const ask = () =>
    start(async () => {
      setError(null);
      const res = await suggestImpact(slug, kind);
      if (res.error) setError(res.error);
      else if (res.text) setDraft(res.text);
    });
  return (
    <div className={aiBox}>
      {draft ? (
        <>
          <p className="whitespace-pre-line text-left text-sm text-dark-slate/80">{draft}</p>
          <div className="flex items-center justify-center gap-4">
            <button type="button" disabled={saving} onClick={() => act(() => saveImpactFollowup(slug, { [field]: draft }), () => setDraft(null))} className={aiButton}>
              {saving ? t("saving") : t("aiUse")}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("aiDiscard")}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-dark-slate/70">{t(`aiIntro_${kind}`)}</p>
          <button type="button" onClick={ask} disabled={pending} className={aiButton}>
            <span aria-hidden>✨</span>
            {pending ? t("aiThinking") : t("aiSuggest")}
          </button>
        </>
      )}
      {(error || saveError) && <p className="text-center text-xs text-watermelon">{error ?? saveError}</p>}
    </div>
  );
}
