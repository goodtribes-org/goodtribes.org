import { NextResponse, type NextRequest } from "next/server";
import { EVENT_COOKIE, EVENT_COOKIE_HOURS, getEventByCode } from "@/lib/events";
import { routing } from "@/i18n/routing";

// The QR link of an evening (#281): remembers which evening the visitor came
// from (EVENT_COOKIE, for its three steps and the big screen) and sends them
// to the evening's page. An unknown code goes to the start page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const event = await getEventByCode(code);
  if (!event) return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url));

  const res = NextResponse.redirect(new URL(`/${routing.defaultLocale}/e/${event.code}?k=1`, request.url));
  res.cookies.set(EVENT_COOKIE, event.code, { path: "/", sameSite: "lax", maxAge: EVENT_COOKIE_HOURS * 60 * 60 });
  return res;
}
