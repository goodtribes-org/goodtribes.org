import { Kalam, Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";

// Shared handwriting-style display font for hero headings (homepage +
// per-project), so both stay in sync instead of loading separate instances.
export const handwritingFont = Kalam({ subsets: ["latin"], weight: ["700"] });

// Thinner variant (same family) for the Polaroid-caption use — the bold
// weight above reads as a thick marker at small sizes.
export const handwritingFontThin = Kalam({ subsets: ["latin"], weight: ["400"] });

// The homepage "showroom" sections (idea band through end-CTA) use a
// distinct three-font system per the design handoff: serif display
// headings, a grotesque body/UI font, and a mono font for eyebrows/labels.
export const displaySerifFont = Instrument_Serif({ subsets: ["latin"], weight: ["400"] });
export const showroomBodyFont = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const showroomMonoFont = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"] });
