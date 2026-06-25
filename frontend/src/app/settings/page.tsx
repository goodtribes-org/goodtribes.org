export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
    select: {
      email: true,
      name: true,
      bio: true,
      image: true,
      digestOptIn: true,
      _count: { select: { skills: true } },
    },
  });
  if (!user) redirect("/login");

  const initials = (user.name ?? user.email ?? "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-xl space-y-10">
      <h1 className="text-2xl font-bold text-dark-slate">Settings</h1>

      {/* Profile card */}
      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-4">
          Profile
        </h2>
        <div className="border border-muted-teal/40 rounded-lg p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-dry-sage flex items-center justify-center text-base font-semibold text-dark-slate overflow-hidden relative flex-shrink-0">
            {user.image ? (
              <Image src={user.image} alt={user.name ?? ""} fill className="object-cover" unoptimized />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-dark-slate truncate">{user.name ?? <span className="text-dark-slate/40 italic">No name set</span>}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5 truncate">
              {user.bio ? user.bio.slice(0, 80) + (user.bio.length > 80 ? "…" : "") : "No bio yet"}
              {user._count.skills > 0 && ` · ${user._count.skills} skill${user._count.skills !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/profile/setup"
            className="shrink-0 px-4 py-2 rounded border border-muted-teal text-sm font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
          >
            Edit profile
          </Link>
        </div>
      </section>

      <SettingsForm email={user.email ?? ""} digestOptIn={user.digestOptIn} />
    </div>
  );
}
