import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { canonicalRedirect } from "./lib/canonicalHost";

// NextAuth(authConfig).auth was previously wired in here, but authConfig has no
// adapter and defaults to JWT strategy. Our sessions use the database strategy
// (PrismaAdapter), so the middleware tried to decode a database session
// token as a JWT, logged JWTSessionError, and cleared the session cookie —
// causing logged-in users to see login prompts on server-rendered pages.
// Route protection is handled per-page via auth() from @/auth instead; this
// middleware handles the canonical host and locale detection/redirect.
const intl = createMiddleware(routing);

// The paths the locale middleware has always handled. `offline` is excluded:
// it's the service worker's non-localized navigateFallback page (see
// next.config.ts additionalPrecacheEntries) and must stay at a fixed,
// unprefixed URL for the precached SW lookup to match.
const LOCALIZED = /^\/(?!api|storage|offline|_next|_vercel|.*\..*).*/;

export default function middleware(req: NextRequest) {
  // One address for the site (#308, lib/canonicalHost.ts).
  const target = canonicalRedirect(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), req.nextUrl.pathname, req.nextUrl.search);
  if (target) return NextResponse.redirect(target, 308);
  if (LOCALIZED.test(req.nextUrl.pathname)) return intl(req);
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static files, so the host redirect covers
  // /api and /storage too; the locale middleware keeps its old paths (above).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
