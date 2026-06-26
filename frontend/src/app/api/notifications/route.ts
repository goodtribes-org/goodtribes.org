import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"


export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([]);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(notifications);
}
