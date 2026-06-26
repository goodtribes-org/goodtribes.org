"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


export async function createCalendarEvent(projectSlug: string, formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login`);

  const title = (formData.get("title") as string | null)?.trim();
  if (!title) return;

  const description = (formData.get("description") as string | null)?.trim() || null;
  const type = (formData.get("type") as string | null) || "custom";

  const startsAtRaw = formData.get("startsAt") as string | null;
  if (!startsAtRaw) return;
  const startsAt = new Date(startsAtRaw);

  const endsAtRaw = formData.get("endsAt") as string | null;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  await prisma.calendarEvent.create({
    data: {
      projectSlug,
      title,
      description,
      type,
      startsAt,
      endsAt: endsAt ?? undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/projects/${projectSlug}/calendar`);
  redirect(`/projects/${projectSlug}/calendar`);
}
