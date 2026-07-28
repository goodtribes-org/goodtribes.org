// Tailwind v4 scans source files textually for class names, so a class built
// by string interpolation from DB data (`bg-${color}/${opacity}`) would never
// be found by the scanner and gets purged from the shipped CSS. Every
// combination the homepage hero can render must therefore appear here as a
// literal string.
export const HERO_TINT_COLORS = ["CORAL", "SEAGRASS", "MUTED_TEAL", "DRY_SAGE", "WATERMELON"] as const;
export type HeroTintColorName = (typeof HERO_TINT_COLORS)[number];
export const HERO_TINT_OPACITIES = [10, 15, 20] as const;
export type HeroTintOpacity = (typeof HERO_TINT_OPACITIES)[number];

export const HERO_TINT_LABELS: Record<HeroTintColorName, string> = {
  CORAL: "Korall",
  SEAGRASS: "Havsgrön",
  MUTED_TEAL: "Dämpad blågrön",
  DRY_SAGE: "Salvia",
  WATERMELON: "Vattenmelon",
};

const TINT_CLASSES: Record<string, string> = {
  "CORAL:10": "bg-coral/10",
  "CORAL:15": "bg-coral/15",
  "CORAL:20": "bg-coral/20",
  "SEAGRASS:10": "bg-seagrass/10",
  "SEAGRASS:15": "bg-seagrass/15",
  "SEAGRASS:20": "bg-seagrass/20",
  "MUTED_TEAL:10": "bg-muted-teal/10",
  "MUTED_TEAL:15": "bg-muted-teal/15",
  "MUTED_TEAL:20": "bg-muted-teal/20",
  "DRY_SAGE:10": "bg-dry-sage/10",
  "DRY_SAGE:15": "bg-dry-sage/15",
  "DRY_SAGE:20": "bg-dry-sage/20",
  "WATERMELON:10": "bg-watermelon/10",
  "WATERMELON:15": "bg-watermelon/15",
  "WATERMELON:20": "bg-watermelon/20",
};

export function heroTintClass(color: string, opacity: number): string {
  return TINT_CLASSES[`${color}:${opacity}`] ?? "bg-coral/10";
}
