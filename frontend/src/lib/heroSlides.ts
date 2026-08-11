import type { HomeHeroSlide } from "@prisma/client";
import type { ObstacleInput, PointInput } from "@/app/[locale]/home-hero-actions";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export type HeroSlideData = {
  id: string;
  imageUrl: string;
  alt: string;
  heading: string;
  body: string;
  bodyLine2: string;
  obstacles: ObstacleInput[];
  outro: string;
  points: PointInput[];
  menuLabel: string;
  tintColor: string;
  tintOpacity: number;
};

// Sanitizes body/outro again at render time (belt-and-suspenders, same as
// SitePage) so rows saved before sanitizeHtml was added on write can't still
// serve stored XSS.
export function toHeroSlideData(s: HomeHeroSlide): HeroSlideData {
  return {
    id: s.id,
    imageUrl: s.imageUrl,
    alt: s.alt,
    heading: s.heading,
    body: sanitizeHtml(s.body),
    bodyLine2: s.bodyLine2 ?? "",
    obstacles: (s.obstacles as unknown as ObstacleInput[] | null) ?? [],
    outro: s.outro ? sanitizeHtml(s.outro) : "",
    points: (s.points as unknown as PointInput[] | null) ?? [],
    menuLabel: s.menuLabel,
    tintColor: s.tintColor,
    tintOpacity: s.tintOpacity,
  };
}
