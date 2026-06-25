"use server";

import { auth, signOut } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

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
