"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { HelperToInvite } from "@/lib/firstTasks";
import { toProxyUrl } from "@/lib/storageUrl";
import { inviteHelperToTeam } from "../../first-task-actions";

// "Bjud in till teamet?" (#284): people who finished a first task here and
// aren't on the team yet. One tap makes them a member.
export default function HelpersToInvite({ projectId, helpers, highlight }: { projectId: string; helpers: HelperToInvite[]; highlight: string | null }) {
  const t = useTranslations("FirstTasks");
  const router = useRouter();
  const [invited, setInvited] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  if (helpers.length === 0) return null;

  function invite(userId: string) {
    startTransition(async () => {
      const r = await inviteHelperToTeam(projectId, userId);
      if ("ok" in r) {
        setInvited((v) => [...v, userId]);
        router.refresh();
      }
    });
  }

  return (
    <section className="mb-8 max-w-3xl rounded-xl border border-seagrass/30 bg-seagrass/5 p-4">
      <h2 className="text-sm font-semibold text-dark-slate">{t("helpersHeading")}</h2>
      <p className="mt-0.5 text-xs text-dark-slate/60">{t("helpersIntro")}</p>
      <ul className="mt-3 divide-y divide-seagrass/15">
        {helpers.map((h) => (
          <li key={h.userId} className={`flex items-center gap-3 py-2.5 ${highlight === h.userId ? "rounded-lg bg-white px-2" : ""}`}>
            {h.image ? (
              <img src={toProxyUrl(h.image)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-seagrass/20 text-xs font-bold text-seagrass">{(h.name ?? "?").charAt(0).toUpperCase()}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-dark-slate">{h.name ?? t("someone")}</p>
              <p className="truncate text-xs text-dark-slate/60">{t("helperDid", { tasks: h.tasks.join(", ") })}</p>
            </div>
            {invited.includes(h.userId) ? (
              <span className="text-xs font-semibold text-seagrass">{t("helperInvited")}</span>
            ) : (
              <button type="button" disabled={pending} onClick={() => invite(h.userId)} className="shrink-0 rounded-full bg-seagrass px-3 py-1.5 text-xs font-semibold text-white hover:bg-seagrass/90 disabled:opacity-50">
                {t("inviteToTeam")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
