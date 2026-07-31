"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/authz";
import type { ShopItem } from "@prisma/client";

export async function createShopItem(
  params: { name: string; description: string; imageUrl: string; costGt: number }
): Promise<{ ok: boolean; error?: string; item?: ShopItem }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const name = params.name.trim();
  if (!name || !(params.costGt > 0)) return { ok: false, error: "Namn och ett positivt GT-pris krävs" };

  const item = await prisma.shopItem.create({
    data: {
      name,
      description: params.description.trim() || null,
      imageUrl: params.imageUrl.trim() || null,
      costGt: params.costGt,
      createdById: session.user.id,
    },
  });

  revalidatePath("/site-admin/shop");
  revalidatePath("/shop");
  return { ok: true, item };
}

export async function updateShopItem(
  id: string,
  params: { name: string; description: string; imageUrl: string; costGt: number }
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  const name = params.name.trim();
  if (!name || !(params.costGt > 0)) return { ok: false, error: "Namn och ett positivt GT-pris krävs" };

  await prisma.shopItem.update({
    where: { id },
    data: {
      name,
      description: params.description.trim() || null,
      imageUrl: params.imageUrl.trim() || null,
      costGt: params.costGt,
    },
  });

  revalidatePath("/site-admin/shop");
  revalidatePath("/shop");
  return { ok: true };
}

export async function setShopItemActive(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Forbidden");
  await requireSiteAdmin(session.user.id);

  await prisma.shopItem.update({ where: { id }, data: { active } });

  revalidatePath("/site-admin/shop");
  revalidatePath("/shop");
  return { ok: true };
}
