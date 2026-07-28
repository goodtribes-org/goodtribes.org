import { prisma } from "@/lib/prisma";
import { toHeroSlideData } from "@/lib/heroSlides";
import HeroCarouselEditor from "@/components/HeroCarouselEditor";

export default async function HeroCarouselAdminPage() {
  const slides = await prisma.homeHeroSlide.findMany({ orderBy: { order: "asc" } });
  const initialSlides = slides.map(toHeroSlideData);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-xl font-bold text-dark-slate mb-1">Hero-karusell</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        Bilderna och texterna som visas i karusellen överst på startsidan.
      </p>
      <HeroCarouselEditor initialSlides={initialSlides} />
    </div>
  );
}
