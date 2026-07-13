import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnreadRoomCount } from "@/lib/rooms";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const count = await getUnreadRoomCount(session.user.id);
  return NextResponse.json({ count });
}
