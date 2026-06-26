import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no Node.js-only providers.
// Used by middleware.ts which runs on the Edge runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/profile/setup",
    error: "/login",
  },
  providers: [],
} satisfies NextAuthConfig;
