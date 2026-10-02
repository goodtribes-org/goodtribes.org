import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "next-intl";
import { isStartPage, safeCallbackPath } from "@/lib/callbackPath";
import { APP_URL, buildMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { saveWelcome } from "./actions";

const GOALS = ["start", "join", "explore"] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WelcomePage" });
  return buildMetadata({ locale, path: "/welcome", title: t("pageTitle") });
}

// Where Auth.js sends someone right after their first sign-in (pages.newUser).
// One question — the name — instead of the full profile form plus a second
// "Vad vill du göra?" page, and then straight back to what they came for.
// The full profile is still there under "Fyll i hela profilen".
export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const [session, t, sp] = await Promise.all([auth(), getTranslations({ locale, namespace: "WelcomePage" }), searchParams]);
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const back = safeCallbackPath(sp.callbackUrl, APP_URL);
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
  const heading = back && !isStartPage(back) ? t("headingContinue") : t("heading");

  return (
    <div className="mx-auto mt-12 max-w-md px-4">
      <h1 className="text-2xl font-bold text-dark-slate">{heading}</h1>
      <p className="mt-2 text-dark-slate/70">{t("intro")}</p>

      <form action={saveWelcome} className="mt-8 flex flex-col gap-6">
        {back && <input type="hidden" name="callbackUrl" value={back} />}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-dark-slate">{t("nameLabel")}</span>
          <input
            name="name"
            required
            maxLength={80}
            autoFocus
            autoComplete="name"
            minLength={2}
            defaultValue={user?.name ?? ""}
            placeholder={t("namePlaceholder")}
            className="rounded-lg border border-muted-teal/50 bg-white px-3 py-2.5 text-base focus:border-seagrass focus:outline-none"
          />
          <span className="text-xs text-dark-slate/60">{t("nameHint")}</span>
        </label>

        {/* Only when they weren't on their way somewhere already. */}
        {(!back || isStartPage(back)) && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold text-dark-slate">{t("goalLabel")}</legend>
            {GOALS.map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-3 rounded-lg border border-muted-teal/40 bg-white px-3 py-2.5 text-sm has-[:checked]:border-seagrass has-[:checked]:bg-seagrass/5">
                <input type="radio" name="goal" value={g} defaultChecked={g === "start"} className="accent-seagrass" />
                {t(`goals.${g}`)}
              </label>
            ))}
          </fieldset>
        )}

        <button type="submit" className="rounded-full bg-seagrass px-5 py-2.5 text-sm font-semibold text-white hover:bg-seagrass/90">
          {t("continue")}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-dark-slate/60">
        {t("moreLater")}{" "}
        <Link href="/profile/setup" className="text-seagrass hover:underline">{t("fullProfile")}</Link>
      </p>
    </div>
  );
}
