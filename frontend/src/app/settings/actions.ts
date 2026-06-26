"use server";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";


export async function updateNotifSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const digestOptIn = formData.get("digestOptIn") === "on";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { digestOptIn },
  });

  revalidatePath("/settings");
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.user.delete({ where: { id: session.user.id } });
  await signOut({ redirectTo: "/" });
}
