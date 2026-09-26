import { Bricolage_Grotesque, Figtree } from "next/font/google";

// Only the new start page (/ny-startsida) uses these. They live here rather
// than in lib/fonts.ts so that no other page pulls in their @font-face rules.
export const newHomeDisplayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"] });
export const newHomeBodyFont = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
