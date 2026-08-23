"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MEMBERS_LIST_TAG, invalidateListCache } from "@/lib/listCache";


export async function setShowProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const show = formData.get("show") === "true";

  await prisma.user.update({
    where: { email: session.user.email },
    data: { showProfile: show },
  });
  invalidateListCache(MEMBERS_LIST_TAG);

  revalidatePath("/profile");
  revalidatePath("/members");
}
