"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startUppstartDrafts } from "./actions";
import { startLanseringDrafts } from "../lansering/actions";
import { startEtableraDrafts } from "../etablera/actions";

const ACTIONS = { uppstart: startUppstartDrafts, lansering: startLanseringDrafts, etablera: startEtableraDrafts };

// "Låt AI:n ta fram utkast" for a whole phase's overview (variant "primary"), or a
// "Försök igen" / "Ta fram utkast" link for one section (variant "link").
export default function DraftButton({
  phase = "uppstart",
  slug,
  section,
  label,
  variant = "link",
}: {
  phase?: keyof typeof ACTIONS;
  slug: string;
  section?: string;
  label: string;
  variant?: "primary" | "link";
}) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const onClick = () =>
    startTransition(async () => {
      setError(null);
      const res = await ACTIONS[phase](slug, section);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={
          variant === "primary"
            ? "rounded-lg bg-seagrass px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            : "font-semibold text-seagrass underline underline-offset-2 hover:opacity-80 disabled:opacity-60"
        }
      >
        {pending ? t("starting") : label}
      </button>
      {error && <span className="mt-1 text-xs text-watermelon">{error}</span>}
    </span>
  );
}
