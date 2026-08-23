import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { toHeroSlideData } from "@/lib/heroSlides";
import HeroCarouselEditor from "@/components/HeroCarouselEditor";
import type { Locale } from "next-intl";

export default async function HeroCarouselAdminPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  const [slides, t] = await Promise.all([
    prisma.homeHeroSlide.findMany({ where: { locale }, orderBy: { order: "asc" } }),
    getTranslations({ locale, namespace: "HeroCarouselAdminPage" }),
  ]);
  const initialSlides = slides.map(toHeroSlideData);

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-dark-slate mb-1">{t("heading", { locale: locale.toUpperCase() })}</h1>
        <p className="text-sm text-dark-slate/50">
          {t("intro", { localeName: locale === "sv" ? t("localeSv") : t("localeEn") })}
        </p>
      </div>

      <section>
        <HeroCarouselEditor initialSlide={initialSlides[0] ?? null} locale={locale} />
      </section>
    </div>
  );
}
