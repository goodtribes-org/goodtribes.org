import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { toHeroSlideData } from "@/lib/heroSlides";
import HeroCarouselEditor from "@/components/HeroCarouselEditor";
import HeroHeadingEditor from "@/components/HeroHeadingEditor";
import OnboardingStepsEditor from "@/components/OnboardingStepsEditor";
import { routing } from "@/i18n/routing";
import type { Locale } from "next-intl";

export default async function HeroCarouselAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  const [slides, heroSettings, onboardingSteps, t] = await Promise.all([
    prisma.homeHeroSlide.findMany({ where: { locale }, orderBy: { order: "asc" } }),
    prisma.homeHeroSettings.findUnique({ where: { locale } }),
    prisma.onboardingStep.findMany({ where: { locale }, orderBy: { order: "asc" } }),
    getTranslations({ locale, namespace: "HeroCarouselAdminPage" }),
  ]);
  const initialSlides = slides.map(toHeroSlideData);

  // A locale nobody has translated yet has zero rows here — rather than
  // showing an admin a blank heading input or six empty onboarding-step
  // rows (which they have no way to add from scratch, since that editor
  // only edits an existing fixed set), pre-fill from the default locale's
  // content as a starting draft. Saving creates this locale's own rows
  // (see updateHeroHeading/updateOnboardingSteps) — the default locale's
  // rows are never touched by editing another locale.
  let draftHeading = heroSettings?.heading;
  let draftSteps = onboardingSteps;
  if (locale !== routing.defaultLocale) {
    if (draftHeading === undefined) {
      const fallback = await prisma.homeHeroSettings.findUnique({ where: { locale: routing.defaultLocale } });
      draftHeading = fallback?.heading;
    }
    if (draftSteps.length === 0) {
      draftSteps = await prisma.onboardingStep.findMany({
        where: { locale: routing.defaultLocale },
        orderBy: { order: "asc" },
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-dark-slate mb-1">{t("heading", { locale: locale.toUpperCase() })}</h1>
        <p className="text-sm text-dark-slate/50">
          {t("intro", { localeName: locale === "sv" ? t("localeSv") : t("localeEn") })}
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">{t("headingSectionTitle")}</h2>
        <HeroHeadingEditor initialHeading={draftHeading ?? t("defaultHeading")} locale={locale} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">{t("carouselSectionTitle")}</h2>
        <HeroCarouselEditor initialSlides={initialSlides} locale={locale} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">{t("stepsSectionTitle")}</h2>
        <OnboardingStepsEditor
          initialSteps={draftSteps.map((s) => ({ id: s.id, order: s.order, label: s.label, href: s.href }))}
          locale={locale}
        />
      </section>
    </div>
  );
}
