import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use edge-safe config — no Prisma, no Node.js-only imports.
// Prisma cannot run on the Edge runtime; the onboarding redirect is
// handled server-side in protected pages via auth() from @/auth.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
