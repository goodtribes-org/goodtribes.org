import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyConversations } from "@/lib/conversations";

// The conversation panel's list (components/ConversationsPanel.tsx): every
// DM, group and channel you're in, unread first. `unread` is the 💬 badge.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getMyConversations(userId);
  return NextResponse.json({ items, unread: items.filter((i) => i.unread).length });
}
