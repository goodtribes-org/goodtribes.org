"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteProjectAsAdmin } from "./actions";

// Deleting a project is irreversible (hard delete, see actions.ts) — this
// used to be a plain server-action form with no confirmation at all, one
// misclick away from permanently destroying a project.
export default function DeleteProjectButton({ slug, title }: { slug: string; title: string }) {
  const t = useTranslations("SiteAdminProjects");
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(t("confirmDelete", { title }))) return;
        startTransition(() => deleteProjectAsAdmin(slug));
      }}
      className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {t("delete")}
    </button>
  );
}
