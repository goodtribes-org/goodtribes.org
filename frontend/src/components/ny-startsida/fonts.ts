import localFont from "next/font/local";

// Only the new start page uses these. They live here rather than in
// lib/fonts.ts so that no other page pulls in their @font-face rules.
// Self-hosted (src/fonts/, see its README) rather than next/font/google.
// Bricolage Grotesque is variable with the optical-size axis, like the
// design: large headings get the narrower display cut automatically
// (font-optical-sizing: auto).
export const newHomeDisplayFont = localFont({ src: "../../fonts/BricolageGrotesque-latin.woff2", weight: "200 800", display: "swap" });
export const newHomeBodyFont = localFont({ src: "../../fonts/Figtree-latin.woff2", weight: "400 700", display: "swap" });
