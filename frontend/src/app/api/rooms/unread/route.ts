import { auth } from "@/auth";
import { getUnreadRoomIds } from "@/lib/rooms";
import { NextResponse } from "next/server";

// Polled by the messages sidebar (every 15s while it's mounted) so unread
// dots for DMs, groups, and channels update live without a navigation/reload.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ unreadRoomIds: [] });

  const unreadRoomIds = await getUnreadRoomIds(session.user.id);
  return NextResponse.json({ unreadRoomIds });
}
