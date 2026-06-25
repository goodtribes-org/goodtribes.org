export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = {
  title: "Settings — GoodTribes.org",
};

const prisma = new PrismaClient();

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, digestOptIn: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-xl space-y-10">
      <h1 className="text-2xl font-bold text-dark-slate">Settings</h1>
      <SettingsForm email={user.email ?? ""} digestOptIn={user.digestOptIn} />
    </div>
  );
}
