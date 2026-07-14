import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { moveKanbanCard } from "@/lib/kanbanMove";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { cardId, newColumn } = await req.json();
  if (!cardId || !newColumn) {
    return NextResponse.json({ error: "Missing cardId or newColumn" }, { status: 400 });
  }

  const result = await moveKanbanCard(cardId, newColumn, session.user.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
