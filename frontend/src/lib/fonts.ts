import { Kalam } from "next/font/google";

// Shared handwriting-style display font for hero headings (homepage +
// per-project), so both stay in sync instead of loading separate instances.
export const handwritingFont = Kalam({ subsets: ["latin"], weight: ["700"] });

// Thinner variant (same family) for the Polaroid-caption use — the bold
// weight above reads as a thick marker at small sizes.
export const handwritingFontThin = Kalam({ subsets: ["latin"], weight: ["400"] });
