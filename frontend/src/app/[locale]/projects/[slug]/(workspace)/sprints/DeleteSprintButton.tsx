"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { deleteSprint } from "./actions";

export default function DeleteSprintButton({ projectSlug, sprintId, sprintName }: {
  projectSlug: string;
  sprintId: string;
  sprintName: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Radera sprinten "${sprintName}" permanent? Alla bidrag, röster och ritytor i den försvinner. Det går inte att ångra.`)) {
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
      title="Radera sprint"
      className="text-xs text-dark-slate/30 hover:text-watermelon transition-colors flex-shrink-0 disabled:opacity-50"
    >
      {isDeleting ? "Raderar…" : "Radera"}
    </button>
  );
}
