"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { signOut } from "next-auth/react";
import { acceptAgreements } from "@/app/[locale]/agreements-actions";

// Paths a logged-in user must still be able to reach without the gate
// blocking them — most importantly the two agreement pages themselves
// (opened in a new tab from the signup checkboxes, but also reachable this
// way for an existing user re-reading them) plus the auth entry points.
// Matched against the pathname with the locale prefix stripped.
const EXEMPT_PATHS = ["/participant-agreement", "/code-of-conduct", "/login", "/signup", "/privacy", "/terms"];

export default function ConsentGate({ needsAgreementConsent }: { needsAgreementConsent: boolean }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [agreedParticipantAgreement, setAgreedParticipantAgreement] = useState(false);
  const [agreedCodeOfConduct, setAgreedCodeOfConduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const strippedPath = pathname.replace(/^\/(sv|en)(?=\/|$)/, "") || "/";
  const isExempt = EXEMPT_PATHS.some((p) => strippedPath === p || strippedPath.startsWith(`${p}/`));

  if (!needsAgreementConsent || isExempt) return null;

  const bothAgreed = agreedParticipantAgreement && agreedCodeOfConduct;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await acceptAgreements(agreedParticipantAgreement, agreedCodeOfConduct);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-dark-slate/60 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6">
        <h2 className="text-lg font-bold text-dark-slate mb-2">{t("consentGateHeading")}</h2>
        <p className="text-sm text-dark-slate/70 mb-4">{t("consentGateBody")}</p>

        <div className="flex flex-col gap-2 mb-4">
          <label className="flex items-start gap-2 text-sm text-dark-slate/80">
            <input
              type="checkbox"
              checked={agreedParticipantAgreement}
              onChange={(e) => setAgreedParticipantAgreement(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t.rich("agreeParticipantAgreement", {
                link: (chunks) => (
                  <a
                    href={`/${locale}/participant-agreement`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:text-watermelon underline underline-offset-4"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-dark-slate/80">
            <input
              type="checkbox"
              checked={agreedCodeOfConduct}
              onChange={(e) => setAgreedCodeOfConduct(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t.rich("agreeCodeOfConduct", {
                link: (chunks) => (
                  <a
                    href={`/${locale}/code-of-conduct`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:text-watermelon underline underline-offset-4"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-watermelon mb-4">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
          >
            {t("consentGateLogOut")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !bothAgreed}
            className="bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t("sending") : t("consentGateContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
