"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { retryIdeaFillSection } from "./actions";

export default function RetryButton({ slug, section }: { slug: string; section: string }) {
  const t = useTranslations("IdeaOverview");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await retryIdeaFillSection(slug, section);
            router.refresh();
          } catch {
            setFailed(true);
          }
        })
      }
      className="ml-2 font-semibold underline underline-offset-2 hover:text-amber-900 disabled:opacity-60"
    >
      {failed ? t("retryFailed") : pending ? t("retrying") : t("retry")}
    </button>
  );
}
