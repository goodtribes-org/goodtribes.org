"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ConfirmationState } from "@/lib/impactConfirmation";
import { createConfirmationLink, revokeConfirmationLink } from "./confirmation-actions";

const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";

export type PartnerLink = {
  id: string;
  label: string;
  state: ConfirmationState;
  date: string;
  confirmerName: string | null;
  confirmerOrg: string | null;
  comment: string | null;
  showOrgPublicly: boolean;
};

// Partnerbekräftelse (#336): "Be en partner bekräfta". One link per
// recipient; the link is shown once, right after it's made (only its hash
// is kept), then the list says how each one went.
export default function PartnerLinks({ slug, links, canEdit, hasStory }: { slug: string; links: PartnerLink[]; canEdit: boolean; hasStory: boolean }) {
  const t = useTranslations("ImpactOverview");
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [made, setMade] = useState<{ label: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      setError(null);
      const res = await createConfirmationLink(slug, label);
      if (res.error || !res.path) return setError(res.error ?? null);
      setMade({ label: label.trim(), url: `${window.location.origin}${res.path}` });
      setCopied(false);
      setLabel("");
      router.refresh();
    });
  const revoke = (id: string) =>
    start(async () => {
      const res = await revokeConfirmationLink(slug, id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  const copy = async () => {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-dark-slate/70">{t("partnerIntro")}</p>
      {canEdit &&
        (hasStory ? (
          <div className="flex flex-wrap items-center gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder={t("partnerLabelPlaceholder")} className={`${input} min-w-0 flex-1`} />
            <button type="button" disabled={pending || !label.trim()} onClick={create} className="rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
              {t("partnerCreate")}
            </button>
          </div>
        ) : (
          <p className="text-xs text-dark-slate/50">{t("partnerNeedsStory")}</p>
        ))}
      {made && (
        <div className="flex flex-col gap-2 rounded-xl border border-seagrass/30 bg-seagrass/5 p-3">
          <p className="text-sm text-dark-slate/80">{t("partnerMade", { label: made.label })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={made.url} onFocus={(e) => e.currentTarget.select()} className={`${input} min-w-0 flex-1 bg-white font-mono text-xs`} />
            <button type="button" onClick={copy} className="rounded-lg border border-seagrass px-3 py-2 text-sm font-semibold text-seagrass hover:bg-seagrass/10">
              {copied ? `✓ ${t("partnerCopied")}` : t("partnerCopy")}
            </button>
          </div>
          <p className="text-xs text-dark-slate/50">{t("partnerOnce")}</p>
        </div>
      )}
      {error && <p className="text-xs text-watermelon">{error}</p>}
      {links.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {links.map((l) => (
            <li key={l.id} className="flex flex-col gap-1 rounded-lg border border-muted-teal/25 bg-white px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-dark-slate">{l.label}</span>
                <span className={`text-xs ${l.state === "confirmed" ? "text-seagrass" : "text-dark-slate/50"}`}>
                  {l.state === "confirmed" ? "✓ " : ""}
                  {t(`partnerState_${l.state}`, { date: l.date })}
                </span>
              </div>
              {l.state === "confirmed" && (
                <p className="text-dark-slate/75">
                  {l.confirmerName}, {l.confirmerOrg}
                  {!l.showOrgPublicly && <span className="text-xs text-dark-slate/50"> · {t("partnerNotPublic")}</span>}
                </p>
              )}
              {l.comment && <p className="italic text-dark-slate/70">”{l.comment}”</p>}
              {canEdit && l.state === "waiting" && (
                <button type="button" disabled={pending} onClick={() => revoke(l.id)} className="self-start text-xs text-dark-slate/50 hover:text-watermelon">
                  {t("partnerRevoke")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
