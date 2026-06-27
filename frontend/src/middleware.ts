import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NextAuth(authConfig).auth was used here, but authConfig has no adapter
// and defaults to JWT strategy. Our sessions use the database strategy
// (PrismaAdapter), so the middleware tried to decode a database session
// token as a JWT, logged JWTSessionError, and cleared the session cookie —
// causing logged-in users to see login prompts on server-rendered pages.
// Route protection is handled per-page via auth() from @/auth instead.
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}
