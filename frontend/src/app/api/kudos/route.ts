import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { createNotification } from "@/lib/notify";
import { guardSocialAction } from "@/lib/socialActionGuard";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromUserId = session.user.id;

  let body: { toUserId?: string; projectId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { toUserId, projectId, message } = body;

  if (!toUserId || typeof toUserId !== "string") {
    return NextResponse.json({ error: "toUserId is required" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (message.length > 160) {
    return NextResponse.json({ error: "message too long (max 160 chars)" }, { status: 400 });
  }

  if (fromUserId === toUserId) {
    return NextResponse.json({ error: "You cannot give kudos to yourself" }, { status: 400 });
  }

  // Kudos now notify the person, so the same suspension + rate-limit guard as
  // likes and "♥ Tacka" applies — otherwise this would be a way to spam
  // someone's notifications.
  const guard = await guardSocialAction(fromUserId, "like");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.code === "SUSPENDED" ? 403 : 429 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  await prisma.kudos.create({
    data: {
      fromUserId,
      toUserId,
      projectId: projectId ?? null,
      message: message.trim(),
    },
  });

  // Members have no stored language yet — the site's default one.
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Thanks" });
  await createNotification({
    userId: toUserId,
    type: "kudos_received",
    title: t("kudosNotificationTitle", { name: session.user.name ?? t("someone") }),
    body: message.trim(),
    url: "/workplace?tab=kudos",
  });

  return NextResponse.json({ success: true });
}
