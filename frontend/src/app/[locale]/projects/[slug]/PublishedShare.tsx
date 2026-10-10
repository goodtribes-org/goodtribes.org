"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import ShareButton from "@/components/ShareButton";

// Right after a lead publishes (#273): the best moment to share, so say so —
// the usual share destinations (with the link to copy) and a QR code to
// show or print. Closing drops ?published=1 so a reload doesn't bring it back.
export default function PublishedShare({ url, title, text, qr, slug }: { url: string; title: string; text?: string; qr: string; slug: string }) {
  const t = useTranslations("PublishedShare");
  const router = useRouter();
  const [open, setOpen] = useState(true);

  if (!open) return null;

  function close() {
    setOpen(false);
    router.replace(`/projects/${slug}`, { scroll: false });
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="published-share-heading" onClick={close}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="published-share-heading" className="text-xl font-bold text-dark-slate">{t("heading")}</h2>
        <p className="mt-2 text-sm text-dark-slate/70">{t("body")}</p>

        {/* At the top, so its menu opens over the QR code, not off screen. */}
        <div className="mt-4">
          <ShareButton url={url} title={title} text={text} variant="block" />
        </div>

        <div className="mt-5 flex justify-center">
          <img src={qr} alt={t("qrAlt")} className="h-48 w-48 rounded-lg border border-muted-teal/30" />
        </div>
        <div className="mt-2 text-center">
          <a href={qr} download={`${slug}-qr.png`} className="text-sm font-medium text-coral hover:underline">{t("downloadQr")}</a>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={close} className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-watermelon">
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
