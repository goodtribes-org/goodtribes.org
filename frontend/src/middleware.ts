import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Paths that bypass the onboarding redirect check
const ONBOARDING_EXEMPT_PREFIXES = [
  "/onboarding",
  "/login",
  "/api",
  "/_next",
  "/favicon",
];

function isExempt(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Use the auth wrapper so we get the session for free
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth((req: any) => {
  const pathname: string = req.nextUrl.pathname;

  // Redirect authenticated but not-yet-onboarded users to /onboarding
  if (req.auth && !isExempt(pathname)) {
    const onboardingDone: boolean = req.auth?.user?.onboardingDone ?? false;
    if (!onboardingDone) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  // Run on all routes except Next.js static/image assets
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
