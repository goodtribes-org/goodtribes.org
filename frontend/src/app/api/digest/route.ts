import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const secret = process.env.DIGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const usersWithNotifications = await prisma.user.findMany({
    where: {
      notifications: {
        some: { read: false, createdAt: { gte: since } },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      notifications: {
        where: { read: false, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { title: true, url: true, createdAt: true },
      },
    },
  });

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  let sent = 0;

  for (const user of usersWithNotifications) {
    if (!user.email) continue;

    const rows = user.notifications
      .map(
        (n) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${n.title}${
            n.url ? ` — <a href="${base}${n.url}" style="color:#E85D4A;">View</a>` : ""
          }</td></tr>`
      )
      .join("");

    await sendEmail({
      to: user.email,
      subject: `You have ${user.notifications.length} unread notification${user.notifications.length !== 1 ? "s" : ""} on GoodTribes`,
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>Here's a summary of your unread notifications from the past week:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
        <p><a href="${base}/notifications" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">View all notifications →</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px;">
          You received this because you have unread notifications on GoodTribes.org.
        </p>
      `,
    });
    sent++;
  }

  return NextResponse.json({ sent, skipped: usersWithNotifications.length - sent });
}
