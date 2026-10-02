"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { MEMBERS_LIST_TAG, invalidateListCache } from "@/lib/listCache";
import { isStartPage, safeCallbackPath } from "@/lib/callbackPath";
import { APP_URL } from "@/lib/metadata";

// A "use server" file may only export async functions.
const MAX_NAME_LENGTH = 80;

// The welcome step's one question: the person's name, so the feed and
// their project say who they are instead of "Någon" or an email address.
// Then back to where they were going (a Drömsamtal, a project they were
// invited to …); with nowhere in particular, the goal they picked.
export async function saveWelcome(formData: FormData) {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) throw new Error("Namn krävs");

  await prisma.user.update({ where: { id: session.user.id }, data: { name, onboardingDone: true } });
  invalidateListCache(MEMBERS_LIST_TAG);

  const back = safeCallbackPath(formData.get("callbackUrl") as string | null, APP_URL);
  if (back && !isStartPage(back)) redirect(back);

  const goal = formData.get("goal");
  if (goal === "start") redirect(`/${locale}/projects/new`);
  if (goal === "join") redirect(`/${locale}/my-goodtribes?tab=find`);
  redirect(`/${locale}/my-goodtribes`);
}
