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
const MAX_BIO_LENGTH = 500;
// Only a picture our own uploader stored (FileUpload → /api/upload), never
// an arbitrary URL from the form.
const OWN_IMAGE = /^\/(storage|api\/files)\/[\w./-]+$/;

// The welcome step: the person's name (required), a picture and a few words
// (optional), so the feed and their projects show who they are instead of
// "Någon" or an email address.
// Then back to where they were going (a Drömsamtal, a project they were
// invited to …); with nowhere in particular, the goal they picked.
export async function saveWelcome(formData: FormData) {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) throw new Error("Namn krävs");

  const bio = ((formData.get("bio") as string | null) ?? "").trim().slice(0, MAX_BIO_LENGTH);
  const image = ((formData.get("image") as string | null) ?? "").trim();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      onboardingDone: true,
      ...(bio ? { bio } : {}),
      ...(OWN_IMAGE.test(image) && !image.includes("..") ? { image } : {}),
    },
  });
  invalidateListCache(MEMBERS_LIST_TAG);

  const back = safeCallbackPath(formData.get("callbackUrl") as string | null, APP_URL);
  if (back && !isStartPage(back)) redirect(back);

  const goal = formData.get("goal");
  if (goal === "start") redirect(`/${locale}/projects/new`);
  if (goal === "join") redirect(`/${locale}/my-goodtribes?tab=find`);
  redirect(`/${locale}/my-goodtribes`);
}
