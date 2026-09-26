import { Bricolage_Grotesque, Caveat, Figtree } from "next/font/google";

// Only the new start page (/ny-startsida) uses these. They live here rather
// than in lib/fonts.ts so that no other page pulls in their @font-face rules.
// Variable, with the optical-size axis, like the design: large headings get
// the narrower display cut automatically (font-optical-sizing: auto).
export const newHomeDisplayFont = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz"] });
export const newHomeBodyFont = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const newHomeScriptFont = Caveat({ subsets: ["latin"], weight: ["600"] });
