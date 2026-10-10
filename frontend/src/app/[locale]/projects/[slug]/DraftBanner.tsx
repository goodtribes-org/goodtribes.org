"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { publishProject } from "./publish-actions";
import { deleteProject } from "./leave-actions";

// Shown on every page of a draft (#226), to its members only (the layout
// 404s everyone else). Leads publish from here; the owner can also throw the
// draft away, which frees a place under the three-draft limit.
export default function DraftBanner({
  slug,
  canPublish,
  canDelete,
  missing,
}: {
  slug: string;
  canPublish: boolean;
  canDelete: boolean;
  missing: ("title" | "about")[];
}) {
  const t = useTranslations("ProjectDraft");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function publish() {
    setError(null);
    start(async () => {
      const res = await publishProject(slug);
      if ("error" in res) setError(res.error === "missing" ? t("missingAbout") : t("publishFailed"));
      // The project page opens its share view (#273); a refresh alone would
      // just unmount this banner.
      else router.push(`/projects/${slug}?published=1`);
    });
  }

  function remove() {
    if (!confirm(t("confirmDelete"))) return;
    start(() => deleteProject(slug));
  }

  return (
    <div
      className="relative -mt-8 mb-8 border-b border-amber-300 bg-amber-50"
      style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">{t("heading")}</p>
          <p className="text-xs text-amber-900/75">{canPublish ? t("bodyLead") : t("bodyMember")}</p>
          {canPublish && missing.length > 0 && (
            <p className="mt-1 text-xs text-amber-900">
              {t("missingAbout")}{" "}
              <Link href={`/projects/${slug}/edit`} className="font-medium underline">
                {t("editLink")}
              </Link>
            </p>
          )}
          {error && <p className="mt-1 text-xs text-watermelon">{error}</p>}
        </div>
        {canPublish && (
          <div className="flex shrink-0 items-center gap-3">
            {canDelete && (
              <button type="button" onClick={remove} disabled={pending} className="text-xs text-amber-900/70 hover:text-watermelon disabled:opacity-50">
                {t("delete")}
              </button>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={pending || missing.length > 0}
              className="rounded-full bg-coral px-4 py-1.5 text-sm font-semibold text-white hover:bg-watermelon disabled:opacity-50"
            >
              {pending ? t("publishing") : t("publish")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
