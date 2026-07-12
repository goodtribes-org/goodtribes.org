"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin, isSiteOwner } from "@/lib/authz";
import type { SiteRole } from "@prisma/client";

export async function setSiteRole(userId: string, role: SiteRole) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  // Only a site OWNER can appoint/demote other site admins — plain ADMINs
  // managing roles could otherwise escalate themselves or peers.
  if (!(await isSiteOwner(session.user.id))) throw new Error("Forbidden");

  await prisma.user.update({ where: { id: userId }, data: { siteRole: role } });
  revalidatePath("/site-admin/users");
}

export async function setSuspended(userId: string, suspended: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.user.update({
    where: { id: userId },
    data: { suspendedAt: suspended ? new Date() : null },
  });
  revalidatePath("/site-admin/users");
}
