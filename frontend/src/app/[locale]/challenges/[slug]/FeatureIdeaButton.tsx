"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setIdeaFeatured } from "../actions";

export default function FeatureIdeaButton({ slug, ideaId, featured }: { slug: string; ideaId: string; featured: boolean }) {
  const t = useTranslations("Challenges");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setIdeaFeatured(slug, ideaId, !featured); router.refresh(); })}
      className="self-start text-xs font-medium text-seagrass hover:underline disabled:opacity-50"
    >
      {featured ? t("unfeature") : t("feature")}
    </button>
  );
}
