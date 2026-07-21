"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Node, Edge } from "@xyflow/react";
import type { Prisma } from "@prisma/client";

export async function saveMindMap(mindMapId: string, nodes: Node[], edges: Edge[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Ej inloggad" };

  const mindMap = await prisma.mindMap.findUnique({
    where: { id: mindMapId },
    include: {
      room: { include: { participants: { where: { userId: session.user.id } } } },
      idea: { select: { authorId: true } },
    },
  });
  if (!mindMap) return { error: "Hittades inte" };

  const authorized = mindMap.roomId
    ? (mindMap.room?.participants.length ?? 0) > 0
    : mindMap.idea?.authorId === session.user.id;
  if (!authorized) return { error: "Ej behörig" };

  await prisma.mindMap.update({
    where: { id: mindMapId },
    data: {
      nodes: nodes as unknown as Prisma.InputJsonValue,
      edges: edges as unknown as Prisma.InputJsonValue,
    },
  });

  if (mindMap.roomId) revalidatePath(`/ideaverkstad/${mindMap.roomId}`);
  if (mindMap.ideaId) revalidatePath(`/ideas/${mindMap.ideaId}`);

  return { ok: true };
}
