import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// NextAuth(authConfig).auth was previously wired in here, but authConfig has no
// adapter and defaults to JWT strategy. Our sessions use the database strategy
// (PrismaAdapter), so the middleware tried to decode a database session
// token as a JWT, logged JWTSessionError, and cleared the session cookie —
// causing logged-in users to see login prompts on server-rendered pages.
// Route protection is handled per-page via auth() from @/auth instead; this
// middleware only handles locale detection/redirect (see matcher below).
export default createMiddleware(routing);

export const config = {
  // `offline` is excluded: it's the service worker's non-localized navigateFallback
  // page (see next.config.ts additionalPrecacheEntries) and must stay at a fixed,
  // unprefixed URL for the precached SW lookup to match.
  matcher: ["/((?!api|storage|offline|_next|_vercel|.*\\..*).*)"],
};
