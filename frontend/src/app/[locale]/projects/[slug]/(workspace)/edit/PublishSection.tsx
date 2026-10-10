"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { publishProject, unpublishProject } from "../../publish-actions";

// Draft or published (#226), on the project's settings page. Publishing is
// also on the draft banner every page shows; going back to a draft is only
// here, and only while nobody else depends on the project being public.
export default function PublishSection({
  slug,
  publishedAt,
  blockers,
  missing,
}: {
  slug: string;
  publishedAt: string | null;
  blockers: ("members" | "funding" | "tokens")[];
  missing: ("title" | "about")[];
}) {
  const t = useTranslations("ProjectDraft");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: typeof publishProject) {
    setError(null);
    start(async () => {
      const res = await action(slug);
      if ("error" in res) setError(res.error === "missing" ? t("missingAbout") : res.error === "blocked" ? t("unpublishBlocked") : t("publishFailed"));
      // Publishing ends on the project page's share view (#273).
      else if (action === publishProject) router.push(`/projects/${slug}?published=1`);
      else router.refresh();
    });
  }

  const date = publishedAt ? new Date(publishedAt).toLocaleDateString("sv-SE") : null;
  return (
    <div className={`rounded-md border p-4 ${publishedAt ? "border-muted-teal/40 bg-white" : "border-amber-300 bg-amber-50/40"}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-dark-slate">{publishedAt ? t("publishedHeading", { date: date! }) : t("heading")}</p>
          <p className="mt-0.5 text-xs text-dark-slate/60">
            {publishedAt
              ? blockers.length
                ? t("unpublishBlockedBecause", { reasons: blockers.map((b) => t(`blocker.${b}`)).join(", ") })
                : t("publishedBody")
              : missing.length
                ? t("missingAbout")
                : t("bodyLead")}
          </p>
          {error && <p className="mt-1 text-xs text-watermelon">{error}</p>}
        </div>
        {publishedAt ? (
          blockers.length === 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(unpublishProject)}
              className="shrink-0 rounded-md border border-muted-teal px-4 py-2 text-sm font-medium text-dark-slate/70 hover:border-dark-slate/40 disabled:opacity-60"
            >
              {pending ? t("saving") : t("unpublish")}
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={pending || missing.length > 0}
            onClick={() => run(publishProject)}
            className="shrink-0 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50"
          >
            {pending ? t("publishing") : t("publish")}
          </button>
        )}
      </div>
    </div>
  );
}
