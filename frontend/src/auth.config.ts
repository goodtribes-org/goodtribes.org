import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no Node.js-only providers.
// Used by middleware.ts which runs on the Edge runtime.
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    // A short "Vad heter du?" step, then back to the callbackUrl.
    newUser: "/welcome",
    error: "/login",
  },
  providers: [],
} satisfies NextAuthConfig;
