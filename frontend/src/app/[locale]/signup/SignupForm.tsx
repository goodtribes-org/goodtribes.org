"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

export default function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [agreedParticipantAgreement, setAgreedParticipantAgreement] = useState(false);
  const [agreedCodeOfConduct, setAgreedCodeOfConduct] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const bothAgreed = agreedParticipantAgreement && agreedCodeOfConduct;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Defense in depth — the submit button is already disabled until both
    // are checked, but never trust that a form only submits via the button.
    if (!bothAgreed) return;
    setLoading(true);
    setError(false);
    const res = await signIn("resend", { email, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError(true);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="p-4 bg-seagrass/10 border border-seagrass/40 rounded-md">
        <p className="text-sm text-dark-slate">{t("sentMessage", { email: sentTo })}</p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="mt-3 text-sm text-coral hover:text-watermelon underline underline-offset-4"
        >
          {t("wrongAddress")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 bg-watermelon/10 border border-watermelon/40 rounded text-sm text-watermelon">
          {t("genericError")}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-dark-slate mb-1">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2 text-sm text-dark-slate/80">
          <input
            type="checkbox"
            checked={agreedParticipantAgreement}
            onChange={(e) => setAgreedParticipantAgreement(e.target.checked)}
            className="mt-0.5"
            required
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
            required
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

      <button
        type="submit"
        disabled={loading || !bothAgreed}
        className="w-full bg-coral text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-watermelon transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t("sending") : t("sendActivationLink")}
      </button>
    </form>
  );
}
