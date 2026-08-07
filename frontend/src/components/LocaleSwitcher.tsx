"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { sv: "SV", en: "EN" };

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  function switchTo(nextLocale: string) {
    if (nextLocale === locale) return;
    const qs = searchParams.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: nextLocale });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-semibold shrink-0" aria-label="Byt språk / Switch language">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-dark-slate/20">|</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            aria-current={locale === l}
            className={locale === l ? "text-dark-slate" : "text-dark-slate/40 hover:text-dark-slate transition-colors"}
          >
            {LABELS[l] ?? l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
