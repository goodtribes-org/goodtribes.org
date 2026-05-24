"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const country = (formData.get("country") as string).trim();

  await prisma.user.update({
    where: { email: session.user.email },
    data: { name, country },
  });

  redirect("/");
}
