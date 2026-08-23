import { NextResponse } from "next/server";
import { multiSearch } from "@/lib/meili";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Public, unauthenticated endpoint — keyed by IP rather than user. 60/30s
// comfortably covers a real search-as-you-type session (a debounced client
// can easily fire several requests per second while someone types) while
// still bounding scraping/abuse from a single source.
const SEARCH_RATE_LIMIT = 60;
const SEARCH_RATE_LIMIT_WINDOW_SECONDS = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const locale = searchParams.get("locale") ?? "sv";
  if (q.length < 2) return NextResponse.json([]);

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`rl:search:${ip}`, SEARCH_RATE_LIMIT, SEARCH_RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const results = await multiSearch(q, locale);
  return NextResponse.json(results);
}
