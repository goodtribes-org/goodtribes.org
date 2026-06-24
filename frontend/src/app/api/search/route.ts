import { NextResponse } from "next/server";
import { multiSearch } from "@/lib/meili";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const results = await multiSearch(q);
  return NextResponse.json(results);
}
