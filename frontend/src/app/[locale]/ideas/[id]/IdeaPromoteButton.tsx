"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { promoteIdea } from "./actions";

export default function IdeaPromoteButton({ ideaId }: { ideaId: string }) {
  const t = useTranslations("IdeaPromoteButton");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await promoteIdea(ideaId);
      if (result?.slug) {
        router.push(`/projects/${result.slug}`);
      } else {
        setError(result?.error ?? t("genericError"));
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-seagrass text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? t("creatingProjectButton") : t("createProjectButton")}
      </button>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
