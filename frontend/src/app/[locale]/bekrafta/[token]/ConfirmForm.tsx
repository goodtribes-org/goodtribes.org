"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { confirmImpact } from "./actions";

const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";

// One click to confirm; a name and an organisation so the team knows who
// saw it. The organisation is shown on the project page only if ticked.
export default function ConfirmForm({ token }: { token: string }) {
  const t = useTranslations("ImpactConfirm");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [comment, setComment] = useState("");
  const [showOrg, setShowOrg] = useState(true);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-6 text-center">
        <p className="text-base font-semibold text-dark-slate">💚 {t("thanks")}</p>
        <p className="mt-1 text-sm text-dark-slate/70">{t("thanksText")}</p>
      </div>
    );
  }

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await confirmImpact(token, { name, org, comment, showOrg, website });
      if (res.error) setError(res.error);
      else setDone(true);
    });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 p-5">
      <h2 className="text-base font-semibold text-dark-slate">{t("formHeading")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} maxLength={80} className={input} />
        <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t("orgPlaceholder")} maxLength={120} className={input} />
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000} placeholder={t("commentPlaceholder")} className={input} />
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex items-start gap-2 text-sm text-dark-slate/80">
        <input type="checkbox" checked={showOrg} onChange={(e) => setShowOrg(e.target.checked)} className="mt-0.5" />
        {t("showOrg")}
      </label>
      <p className="text-xs text-dark-slate/50">{t("privacy")}</p>
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || !name.trim() || !org.trim()} onClick={submit} className="rounded-lg bg-seagrass px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {pending ? t("sending") : `✓ ${t("confirm")}`}
        </button>
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </section>
  );
}
