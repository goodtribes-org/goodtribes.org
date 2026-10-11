"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addInterest } from "./interest-actions";

const input = "w-full rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";

// "Jag vill att det här startar där jag bor" (#332): a place, and — for
// those who want to help start it — a name and a way to be reached. No
// account needed.
export default function InterestButton({ slug }: { slug: string }) {
  const t = useTranslations("InterestSection");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [help, setHelp] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) return <p className="text-sm text-seagrass">💚 {t("thanks")}</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg border border-seagrass px-4 py-2 text-sm font-semibold text-seagrass hover:bg-seagrass/10">
        📍 {t("button")}
      </button>
    );

  const send = () =>
    start(async () => {
      setError(null);
      const res = await addInterest(slug, { place, wantsToHelp: help, name, contact, website });
      if (res.error) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-2">
      <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("placePlaceholder")} className={input} aria-label={t("placeLabel")} />
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="website" />
      <label className="flex items-start gap-2 text-sm text-dark-slate/80">
        <input type="checkbox" checked={help} onChange={(e) => setHelp(e.target.checked)} className="mt-0.5" />
        {t("helpLabel")}
      </label>
      {help && (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className={input} />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("contactPlaceholder")} className={input} />
          <p className="text-xs text-dark-slate/50">{t("privacy")}</p>
        </>
      )}
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || place.trim().length < 2} onClick={send} className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("cancel")}</button>
      </div>
      {error && <span className="text-xs text-watermelon">{error}</span>}
    </div>
  );
}
