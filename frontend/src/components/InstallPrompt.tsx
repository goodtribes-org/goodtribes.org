"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const t = useTranslations("Install");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-muted-teal rounded-xl shadow-lg px-4 py-3 max-w-sm w-[calc(100%-2rem)]">
      <p className="text-sm text-dark-slate/80 flex-1">{t("prompt")}</p>
      <button
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice;
          setInstallEvent(null);
        }}
        className="text-sm font-semibold text-seagrass hover:text-dark-slate whitespace-nowrap"
      >
        {t("install")}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="text-dark-slate/40 hover:text-dark-slate"
      >
        ✕
      </button>
    </div>
  );
}
