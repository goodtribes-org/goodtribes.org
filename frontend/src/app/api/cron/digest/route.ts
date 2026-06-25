import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "@/lib/email";

const prisma = new PrismaClient();

// Called weekly by an external scheduler (e.g. GitHub Actions cron or Kubernetes CronJob).
// Requires Authorization: Bearer <CRON_SECRET> header to prevent unauthorized calls.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const base = process.env.NEXTAUTH_URL ?? "https://goodtribes.org";
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Users who opted in and have unread notifications
  const users = await prisma.user.findMany({
    where: {
      digestOptIn: true,
      notifications: { some: { read: false, createdAt: { gte: oneWeekAgo } } },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notifications: {
        where: { read: false, createdAt: { gte: oneWeekAgo } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { title: true, body: true, url: true, type: true },
      },
    },
  });

  let sent = 0;
  for (const user of users) {
    if (!user.email || user.notifications.length === 0) continue;

    const rows = user.notifications
      .map(
        (n) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${n.url ? `<a href="${base}${n.url}" style="color:#E85D4A;text-decoration:none;">${n.title}</a>` : n.title}
            ${n.body ? `<br><span style="color:#888;font-size:12px;">${n.body}</span>` : ""}
          </td></tr>`
      )
      .join("");

    await sendEmail({
      to: user.email,
      subject: `Your GoodTribes weekly digest — ${user.notifications.length} update${user.notifications.length !== 1 ? "s" : ""}`,
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>Here's what happened on GoodTribes this week:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
        <p><a href="${base}/notifications" style="background:#E85D4A;color:white;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">View all notifications →</a></p>
        <p style="color:#aaa;font-size:11px;margin-top:32px;">
          You're receiving this because you opted in to weekly digests.
          <a href="${base}/settings" style="color:#aaa;">Unsubscribe</a>
        </p>
      `,
    }).catch(() => {});

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
