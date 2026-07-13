import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { redisPub } from "@/lib/redis";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({});

  const userIds = (new URL(request.url).searchParams.get("userIds") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 100);
  if (userIds.length === 0) return NextResponse.json({});

  const values = await redisPub.mget(userIds.map((id) => `presence:${id}`));
  const status: Record<string, boolean> = {};
  userIds.forEach((id, i) => {
    status[id] = values[i] !== null;
  });
  return NextResponse.json(status);
}
