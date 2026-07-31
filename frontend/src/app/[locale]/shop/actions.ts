"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getGtBalance } from "@/lib/tokens";

export async function redeemShopItem(itemId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not logged in" };

  const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
  if (!item || !item.active) return { ok: false, error: "Item not available" };

  const balance = await getGtBalance(session.user.id);
  if (balance < item.costGt) return { ok: false, error: "Insufficient GT balance" };

  await prisma.$transaction([
    prisma.gtLedger.create({
      data: {
        userId: session.user.id,
        tokens: -item.costGt,
        reason: `Shop: ${item.name}`,
      },
    }),
    prisma.shopRedemption.create({
      data: { itemId: item.id, userId: session.user.id, gtSpent: item.costGt },
    }),
  ]);

  revalidatePath("/shop");
  return { ok: true };
}
