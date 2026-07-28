import type { HomeHeroSlide } from "@prisma/client";
import type { ObstacleInput, PointInput } from "@/app/[locale]/home-hero-actions";

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

export function toHeroSlideData(s: HomeHeroSlide): HeroSlideData {
  return {
    id: s.id,
    imageUrl: s.imageUrl,
    alt: s.alt,
    heading: s.heading,
    body: s.body,
    bodyLine2: s.bodyLine2 ?? "",
    obstacles: (s.obstacles as unknown as ObstacleInput[] | null) ?? [],
    outro: s.outro ?? "",
    points: (s.points as unknown as PointInput[] | null) ?? [],
    menuLabel: s.menuLabel,
    tintColor: s.tintColor,
    tintOpacity: s.tintOpacity,
  };
}
