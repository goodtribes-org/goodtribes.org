"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";
import { normalizeEventCode } from "@/lib/events";

// Site admins create an evening (#281): a title and a short code for the QR
// link (/api/e/<code>), optionally when it starts and ends.
export async function createEvent(form: FormData): Promise<void> {
  const userId = await requireAdminSession();
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const code = normalizeEventCode(String(form.get("code") ?? ""));
  if (!title || !code) return;
  const date = (k: string) => {
    const v = String(form.get(k) ?? "");
    return v ? new Date(v) : null;
  };
  await prisma.event.upsert({
    where: { code },
    create: { code, title, startsAt: date("startsAt"), endsAt: date("endsAt"), createdById: userId },
    update: { title, startsAt: date("startsAt"), endsAt: date("endsAt") },
  });
  revalidatePath("/site-admin/events");
}
