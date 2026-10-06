"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { publishChallenge } from "../actions";

// For the organisation's leads on their challenge page (#228): edit, and
// publish a draft — which opens it for ideas and tells the members.
export default function ChallengeAdminBar({ slug, published }: { slug: string; published: boolean }) {
  const t = useTranslations("Challenges");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${published ? "border-muted-teal/40 bg-white" : "border-amber-300 bg-amber-50"}`}>
      <p className="text-sm text-dark-slate/75">{published ? t("adminPublished") : t("adminDraft")}</p>
      <div className="flex items-center gap-3">
        <Link href={`/challenges/${slug}/edit`} className="text-sm font-medium text-seagrass hover:underline">{t("edit")}</Link>
        {!published && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await publishChallenge(slug);
                if ("error" in res) setError(t(res.error === "date" ? "publishDateError" : "publishError"));
                else router.refresh();
              })
            }
            className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-60"
          >
            {pending ? t("publishing") : t("publish")}
          </button>
        )}
      </div>
      {error && <p className="w-full text-xs text-watermelon">{error}</p>}
    </div>
  );
}
