"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/authz";
import { SITE_COPY_KEYS } from "@/lib/siteCopyFields";

// A blank field clears the override (deletes the row) so an admin can
// explicitly "reset to default" — same idea as leaving a field untouched
// before any override existed.
export async function saveSiteCopy(locale: string, formData: FormData) {
  await requireAdminSession();

  const ops = SITE_COPY_KEYS.map((key) => {
    const raw = formData.get(key);
    const value = typeof raw === "string" ? raw.trim() : "";
    return value
      ? prisma.siteCopy.upsert({
          where: { key_locale: { key, locale } },
          create: { key, locale, value },
          update: { value },
        })
      : prisma.siteCopy.deleteMany({ where: { key, locale } });
  });

  await prisma.$transaction(ops);

  revalidatePath("/");
  revalidatePath("/sandbox");
  revalidatePath("/site-admin/site-copy");
}
