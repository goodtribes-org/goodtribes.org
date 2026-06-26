"use server";

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"


export async function logActivity(
  projectId: string,
  userId: string,
  type: string,
  payload?: Record<string, unknown>,
) {
  try {
    await prisma.activityEvent.create({
      data: { projectId, userId, type, payload: payload as Prisma.InputJsonValue | undefined },
    });
  } catch {
    // best-effort — never throw from here
  }
}
