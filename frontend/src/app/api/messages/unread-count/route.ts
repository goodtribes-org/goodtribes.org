import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnreadConversationCount } from "@/lib/conversations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const count = await getUnreadConversationCount(session.user.id);
  return NextResponse.json({ count });
}
