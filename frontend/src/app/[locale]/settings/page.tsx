export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import SettingsForm from "./SettingsForm";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SettingsPage" });
  return buildMetadata({ locale, path: "/settings", title: t("pageTitle") });
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "SettingsPage" }),
  ]);
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
      <h1 className="text-2xl font-bold text-dark-slate">{t("heading")}</h1>

      {/* Profile card */}
      <section>
        <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-4">
          {t("profileHeading")}
        </h2>
        <div className="border border-muted-teal/40 rounded-lg p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-dry-sage flex items-center justify-center text-base font-semibold text-dark-slate overflow-hidden relative flex-shrink-0">
            {user.image ? (
              <Image src={user.image} alt={user.name ?? ""} fill className="object-cover" unoptimized />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-dark-slate truncate">{user.name ?? <span className="text-dark-slate/40 italic">{t("noNameSet")}</span>}</p>
            <p className="text-xs text-dark-slate/50 mt-0.5 truncate">
              {user.bio ? user.bio.slice(0, 80) + (user.bio.length > 80 ? "…" : "") : t("noBioYet")}
              {user._count.skills > 0 && ` · ${t("skillCount", { count: user._count.skills })}`}
            </p>
          </div>
          <Link
            href="/profile/setup"
            className="shrink-0 px-4 py-2 rounded border border-muted-teal text-sm font-medium text-dark-slate/70 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
          >
            {t("editProfileLink")}
          </Link>
        </div>
      </section>

      <SettingsForm email={user.email ?? ""} digestOptIn={user.digestOptIn} />
    </div>
  );
}
