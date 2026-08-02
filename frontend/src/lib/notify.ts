import { prisma } from "@/lib/prisma"
import { publishToUser } from "@/lib/redis";


export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
}) {
  try {
    const notification = await prisma.notification.create({ data: params });
    publishToUser(params.userId, { type: "notification", notification });
  } catch {
    // best-effort — never block the main flow
  }
}
