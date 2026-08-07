"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteSprint } from "./actions";

export default function DeleteSprintButton({ projectSlug, sprintId, sprintName }: {
  projectSlug: string;
  sprintId: string;
  sprintName: string;
}) {
  const t = useTranslations("DeleteSprintButton");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("confirmDelete", { name: sprintName }))) {
      return;
    }
    setIsDeleting(true);
    await deleteSprint(projectSlug, sprintId);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={isDeleting}
      onClick={handleDelete}
      title={t("deleteSprintTitle")}
      className="text-xs text-dark-slate/30 hover:text-watermelon transition-colors flex-shrink-0 disabled:opacity-50"
    >
      {isDeleting ? t("deleting") : t("delete")}
    </button>
  );
}
