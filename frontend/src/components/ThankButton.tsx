"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { thankContribution } from "@/app/thanks-actions";

// "♥ Tacka" on a feed item: thanks whoever did it (resolved server-side) and
// tells them with a notification. Shows how many have said thanks; once the
// viewer has, it stays "♥ Tackat". Logged-out visitors get a way to log in;
// your own contributions just show the count.
export default function ThankButton({
  targetType, targetId, initialCount, initialThanked, isLoggedIn, isOwn,
}: {
  targetType: string; targetId: string; initialCount: number; initialThanked: boolean; isLoggedIn: boolean; isOwn: boolean;
}) {
  const t = useTranslations("Thanks");
  const [count, setCount] = useState(initialCount);
  const [thanked, setThanked] = useState(initialThanked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const base = "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors";
  const countLabel = count > 0 ? <span className="font-normal opacity-80">· {count}</span> : null;

  if (!isLoggedIn) {
    return (
      <Link href="/login" title={t("loginToThank")} className={`${base} border-[#E4E4DF] bg-white text-[#C2410C] hover:border-[#E8531F]`}>
        ♥ {t("thank")} {countLabel}
      </Link>
    );
  }

  if (isOwn) {
    return count > 0 ? (
      <span title={t("ownContribution")} className={`${base} border-transparent text-[#6B726E]`}>♥ {t("thanksCount", { count })}</span>
    ) : null;
  }

  function thank() {
    if (thanked || pending) return;
    setError(null);
    // Optimistic — the button flips at once, and is put back if the server says no.
    setThanked(true);
    setCount((c) => c + 1);
    startTransition(async () => {
      const result = await thankContribution(targetType, targetId);
      if (result.ok) {
        setCount(result.count);
      } else {
        setThanked(false);
        setCount((c) => Math.max(0, c - 1));
        setError(result.error || t("error"));
      }
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        onClick={thank}
        disabled={thanked}
        aria-pressed={thanked}
        className={
          thanked
            ? `${base} border-[#E8531F] bg-[#FFF4EC] text-[#C2410C]`
            : `${base} border-[#E4E4DF] bg-white text-[#C2410C] hover:border-[#E8531F]`
        }
      >
        ♥ {thanked ? t("thanked") : t("thank")} {countLabel}
      </button>
      {error && <span role="alert" className="mt-1 max-w-[12rem] text-right text-[11px] text-[#B42318]">{error}</span>}
    </span>
  );
}
