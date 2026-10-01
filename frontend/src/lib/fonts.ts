import localFont from "next/font/local";

// Self-hosted (src/fonts/, see its README) rather than next/font/google: the
// Google fetch at build time intermittently broke the CI Docker build.

// The site's base sans font (also applied to <html> in the root layout) —
// shared here so the homepage "showroom" sections and the offline page use
// the exact same Inter instance instead of loading a second copy of it.
export const siteSansFont = localFont({ src: "../fonts/Inter-latin.woff2", weight: "400 800", display: "swap" });

// Script font for "Vi gör goda drömmar verkliga." — the start page hero's
// tagline and the footer's.
export const heroTaglineFont = localFont({ src: "../fonts/Satisfy-latin.woff2", weight: "400", display: "swap" });

// Thin handwriting font for the Polaroid caption on project pages.
export const handwritingFontThin = localFont({ src: "../fonts/Kalam-latin.woff2", weight: "400", display: "swap" });

// Mono font for the homepage "showroom" sections' eyebrows/labels.
export const showroomMonoFont = localFont({ src: "../fonts/JetBrainsMono-latin.woff2", weight: "400 500", display: "swap" });
