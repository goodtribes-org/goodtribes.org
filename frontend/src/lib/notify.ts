import { prisma } from "@/lib/prisma"


export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
}) {
  try {
    await prisma.notification.create({ data: params });
  } catch {
    // best-effort — never block the main flow
  }
}
