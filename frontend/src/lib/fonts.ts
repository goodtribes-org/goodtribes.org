import { Kalam } from "next/font/google";

// Shared handwriting-style display font for hero headings (homepage +
// per-project), so both stay in sync instead of loading separate instances.
export const handwritingFont = Kalam({ subsets: ["latin"], weight: ["700"] });
