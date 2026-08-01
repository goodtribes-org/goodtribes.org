import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { moveKanbanCard } from "@/lib/kanbanMove";
import { GITHUB_CARD_LOCKED_MESSAGE } from "@/lib/githubSync";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { cardId, newColumn, overrides } = await req.json();
  if (!cardId || !newColumn) {
    return NextResponse.json({ error: "Missing cardId or newColumn" }, { status: 400 });
  }

  const result = await moveKanbanCard(cardId, newColumn, session.user.id, overrides);
  if ("error" in result) {
    // A GitHub-mirrored card exists, it just may not be moved — 403, not 404.
    const status = result.error === GITHUB_CARD_LOCKED_MESSAGE ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
