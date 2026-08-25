"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";

// Site-admin-only user search for the owner-transfer picker. Unlike
// searchUsersToAdd (member-actions.ts), this deliberately does NOT exclude
// current project members — an admin may want to hand ownership to someone
// already on the team just as often as to an outside user.
export async function searchAnyUser(
  query: string
): Promise<{ id: string; name: string | null; image: string | null; email: string }[]> {
  await requireAdminSession();

  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, image: true, email: true },
    take: 8,
    orderBy: { name: "asc" },
  });
}
