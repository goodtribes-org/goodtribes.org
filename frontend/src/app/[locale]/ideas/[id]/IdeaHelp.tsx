"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setIdeaHelp } from "./actions";

export const HELP_ROLE_KEYS = ["CODE", "DESIGN", "COMMUNICATION", "FUNDRAISING", "CONTACTS", "LOCAL_KNOWLEDGE", "PRACTICAL"] as const;

// "Jag vill hjälpa till" (#235): pick what you could help with if the idea
// gets going. The counts per role show the idea's author and anyone who
// wants to drive it what help is already on offer.
export default function IdeaHelp({
  ideaId,
  isLoggedIn,
  myRoles,
  helperCount,
  roleCounts,
}: {
  ideaId: string;
  isLoggedIn: boolean;
  // null = not helping yet.
  myRoles: string[] | null;
  helperCount: number;
  roleCounts: Record<string, number>;
}) {
  const t = useTranslations("IdeaHelp");
  const [picked, setPicked] = useState<string[]>(myRoles ?? []);
  const [helping, setHelping] = useState(myRoles !== null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const toggle = (r: string) => {
    setSaved(false);
    setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  };
  const save = (roles: string[] | null) =>
    startTransition(async () => {
      const res = await setIdeaHelp(ideaId, roles);
      if (res && "ok" in res) {
        setHelping(roles !== null);
        setSaved(roles !== null);
        if (roles === null) setPicked([]);
      }
    });

  return (
    <section id="hjalp" className="mb-8 scroll-mt-24 rounded-xl border border-muted-teal/40 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-dark-slate">{t("heading")}</h2>
      <p className="mt-1 text-sm text-dark-slate/60">{helperCount > 0 ? t("count", { count: helperCount }) : t("none")}</p>
      {helperCount > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {HELP_ROLE_KEYS.filter((r) => roleCounts[r]).map((r) => (
            <li key={r} className="rounded-full bg-dry-sage/40 px-2.5 py-0.5 text-xs text-dark-slate/70">
              {t(`roles.${r}`)} · {roleCounts[r]}
            </li>
          ))}
        </ul>
      )}
      {isLoggedIn ? (
        <>
          <p className="mt-4 text-sm font-medium text-dark-slate">{t("pickHeading")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HELP_ROLE_KEYS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={picked.includes(r)}
                onClick={() => toggle(r)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  picked.includes(r) ? "bg-seagrass text-white" : "border border-muted-teal text-dark-slate/70 hover:border-seagrass"
                }`}
              >
                {t(`roles.${r}`)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending || picked.length === 0}
              onClick={() => save(picked)}
              className="rounded-full border border-seagrass px-4 py-2 text-sm font-semibold text-seagrass hover:bg-seagrass/5 disabled:opacity-40"
            >
              {helping ? t("update") : t("join")}
            </button>
            {helping && (
              <button type="button" disabled={pending} onClick={() => save(null)} className="text-xs text-dark-slate/50 hover:text-dark-slate">
                {t("leave")}
              </button>
            )}
            {saved && <span className="text-xs text-seagrass">{t("saved")}</span>}
          </div>
          <p className="mt-2 text-xs text-dark-slate/45">{t("note")}</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-dark-slate/60">{t("loginToHelp")}</p>
      )}
    </section>
  );
}
