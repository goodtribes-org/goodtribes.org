"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { answerInviteQuestion } from "./actions";

// "Startar du projektet tillsammans med någon?" — at the end of the Idé
// page's first step for a lead who's still alone in the project, until it's
// answered (#201).
// Inviting isn't a step: some start together, some wait until the idea feels
// ready, and "Bjud in" by the project title is always there.
export default function StartTogetherQuestion({ slug }: { slug: string }) {
  const t = useTranslations("StartTogether");
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  function answer(invite: boolean) {
    startTransition(async () => {
      const res = await answerInviteQuestion(slug);
      if ("error" in res) return;
      setHidden(true);
      if (invite) router.push(`/projects/${slug}/members`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
      <div>
        <p className="font-semibold text-dark-slate">{t("question")}</p>
        <p className="text-sm text-dark-slate/65">{t("why")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => answer(true)}
          disabled={pending}
          className="rounded-full bg-seagrass px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-seagrass/90 disabled:opacity-60"
        >
          {t("invite")}
        </button>
        <button type="button" onClick={() => answer(false)} disabled={pending} className="text-sm text-dark-slate/60 hover:text-dark-slate">
          {t("notNow")}
        </button>
      </div>
    </div>
  );
}
