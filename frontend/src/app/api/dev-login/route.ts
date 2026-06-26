import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto";


export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const email =
    process.env.DEV_EMAIL ?? "niklas.gunnas@goodtribes.org";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: "Dev User", onboardingDone: true },
    });
  }

  // Delete stale dev sessions to keep the table clean
  await prisma.session.deleteMany({ where: { userId: user.id } });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  const callbackUrl =
    new URL(request.url).searchParams.get("callbackUrl") ?? "/";
  const response = NextResponse.redirect(new URL(callbackUrl, request.url));

  // NextAuth v5 uses "authjs.session-token" on HTTP (localhost)
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    expires,
    path: "/",
  });

  return response;
}
