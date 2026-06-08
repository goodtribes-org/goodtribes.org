"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function setShowProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const show = formData.get("show") === "true";

  await prisma.user.update({
    where: { email: session.user.email },
    data: { showProfile: show },
  });

  revalidatePath("/profile");
  revalidatePath("/members");
}
