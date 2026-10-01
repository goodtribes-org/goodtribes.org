"use server";

import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";
import { createNotification } from "@/lib/notify";
import { guardSocialAction } from "@/lib/socialActionGuard";
import { isThankableType, resolveThanksTarget } from "@/lib/thanks";

export type ThankResult =
  | { ok: true; count: number }
  | { ok: false; error: string; code?: "NOT_LOGGED_IN" | "SUSPENDED" | "RATE_LIMITED" | "OWN" | "NOT_FOUND" };

// Thank whoever did a feed item: a Kudos tied to the item, with a message
// written for them ("Tack för att du startade Skolmatappen!"), and a
// notification. The recipient comes from the item itself (lib/thanks.ts),
// never from the client. Thanking twice is a no-op, and there's no
// "un-thank" — a thank-you, once said, stays said.
export async function thankContribution(targetType: string, targetId: string): Promise<ThankResult> {
  const session = await auth();
  const fromUserId = session?.user?.id;
  if (!fromUserId) return { ok: false, error: "Logga in för att tacka.", code: "NOT_LOGGED_IN" };
  if (!isThankableType(targetType)) return { ok: false, error: "Det här går inte att tacka för.", code: "NOT_FOUND" };

  const target = await resolveThanksTarget(targetType, targetId);
  if (!target) return { ok: false, error: "Det här går inte att tacka för.", code: "NOT_FOUND" };
  if (target.recipientId === fromUserId) return { ok: false, error: "Du kan inte tacka dig själv.", code: "OWN" };

  const guard = await guardSocialAction(fromUserId, "like");
  if (!guard.ok) return { ok: false, error: guard.error, code: guard.code };

  // Created here, rather than found or lost to a racing double click — only
  // then does the person get a notification.
  // Members have no stored language yet, so the message and notification are
  // written in the site's default one.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Thanks" });
  const values = { project: target.project ?? "", title: target.title ?? "" };

  let created = false;
  try {
    await prisma.kudos.create({
      data: {
        fromUserId, toUserId: target.recipientId, projectId: target.projectId,
        targetType, targetId, message: t(`kudosMessage.${target.kind}`, values),
      },
    });
    created = true;
  } catch {
    // Unique key (fromUserId, targetType, targetId): already thanked.
  }

  if (created) {
    await createNotification({
      userId: target.recipientId,
      type: "thanks_received",
      title: t("notificationTitle", { name: session.user?.name ?? t("someone") }),
      body: t(`notificationBody.${target.kind}`, values),
      url: target.href,
    });
  }

  const count = await prisma.kudos.count({ where: { targetType, targetId } });
  return { ok: true, count };
}
