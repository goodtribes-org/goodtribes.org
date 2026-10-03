"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// "Startar du projektet tillsammans med någon?" — asked once, right after a
// project is created, while the founder is still alone in it. Inviting isn't
// a step of the Idé phase (2026-10-03): some start together and want people
// in from day one, others want to wait until the idea is ready. "Inte nu"
// hides it for this project on this device; the "Bjud in" button next to the
// project title stays for whenever they're ready.
export default function StartTogetherPrompt({ slug }: { slug: string }) {
  const t = useTranslations("StartTogether");
  const key = `gt:start-together:${slug}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "dismissed");
    } catch {
      setHidden(false);
    }
  }, [key]);

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(key, "dismissed");
    } catch {
      // no storage: it just shows again next time
    }
  }

  return (
    <div className="mx-auto my-4 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-dark-slate">{t("question")}</p>
        <p className="text-xs text-dark-slate/70">{t("hint")}</p>
      </div>
      <Link href={`/projects/${slug}/invite`} className="rounded-full bg-seagrass px-4 py-1.5 text-sm font-semibold text-white hover:bg-seagrass/90">
        {t("invite")}
      </Link>
      <button type="button" onClick={dismiss} className="text-sm text-dark-slate/60 hover:text-dark-slate">
        {t("notNow")}
      </button>
    </div>
  );
}
