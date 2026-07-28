import { prisma } from "@/lib/prisma";
import { toHeroSlideData } from "@/lib/heroSlides";
import HeroCarouselEditor from "@/components/HeroCarouselEditor";
import HeroHeadingEditor from "@/components/HeroHeadingEditor";
import OnboardingStepsEditor from "@/components/OnboardingStepsEditor";

export default async function HeroCarouselAdminPage() {
  const [slides, heroSettings, onboardingSteps] = await Promise.all([
    prisma.homeHeroSlide.findMany({ orderBy: { order: "asc" } }),
    prisma.homeHeroSettings.findFirst(),
    prisma.onboardingStep.findMany({ orderBy: { order: "asc" } }),
  ]);
  const initialSlides = slides.map(toHeroSlideData);

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-dark-slate mb-1">Startsidan</h1>
        <p className="text-sm text-dark-slate/50">
          Rubrik, bildkarusell och de sex startstegen som visas överst på startsidan.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">Rubrik</h2>
        <HeroHeadingEditor initialHeading={heroSettings?.heading ?? "Välkommen till GoodTribes"} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">Hero-karusell</h2>
        <HeroCarouselEditor initialSlides={initialSlides} />
      </section>

      <section>
        <h2 className="text-base font-semibold text-dark-slate mb-2">Startstegen (de sex cirklarna)</h2>
        <OnboardingStepsEditor initialSteps={onboardingSteps.map((s) => ({ id: s.id, label: s.label, href: s.href }))} />
      </section>
    </div>
  );
}
