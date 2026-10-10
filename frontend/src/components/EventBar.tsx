"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// While someone is at an evening (#281, the QR code's cookie), a slim bar
// under the header keeps the three steps in reach — after Drömguiden they
// land on their project, and this is the way back to step 2. Asked again on
// every page change: the root layout doesn't re-render on client navigation,
// so a server-rendered bar would show a stale step.
export const EVENT_PROGRESS = "gt-event-progress";

type Status = { event: { code: string; title: string } | null; done?: number };

export default function EventBar() {
  const t = useTranslations("Event");
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const load = () => {
      // Only someone who came through a QR link has the cookie; skip the request otherwise.
      if (!document.cookie.split("; ").some((c) => c.startsWith("gt_event="))) return setStatus(null);
      fetch("/api/e/status", { cache: "no-store" })
        .then((r) => r.json())
        .then((s: Status) => setStatus(s))
        .catch(() => setStatus(null));
    };
    load();
    // A step done without leaving the page (the evening's step 2) says so.
    window.addEventListener(EVENT_PROGRESS, load);
    return () => window.removeEventListener(EVENT_PROGRESS, load);
  }, [pathname]);

  if (!status?.event) return null;
  const done = status.done ?? 0;
  return (
    <Link href={`/e/${status.event.code}`} className="block bg-[#1B1F1D] px-4 py-2 text-center text-sm text-white hover:bg-[#2a302d]">
      <span className="font-bold text-[#F6A57F]">{status.event.title}</span>{" · "}
      {done >= 3 ? t("barDone") : t("barStep", { step: done + 1 })} <span aria-hidden>→</span>
    </Link>
  );
}
