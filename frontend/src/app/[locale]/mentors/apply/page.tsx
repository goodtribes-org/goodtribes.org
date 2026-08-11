import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import ApplyForm from "./ApplyForm";
import type { Locale } from "next-intl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MentorApplyPage" });
  return buildMetadata({
    locale,
    path: "/mentors/apply",
    title: t("pageTitle"),
    description: t("pageDescription"),
  });
}

export default async function ApplyMentorPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "MentorApplyPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.mentor.findUnique({
    where: { userId: session.user.id },
    select: { id: true, verified: true },
  });

  if (existing) {
    return (
      <div className="max-w-lg">
        <Link
          href="/mentors"
          className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
        >
          {t("backToMentors")}
        </Link>
        <div className="p-6 border border-muted-teal/40 rounded-xl text-center">
          {existing.verified ? (
            <>
              <p className="font-semibold text-dark-slate mb-1">{t("alreadyVerified")}</p>
              <Link href="/mentors" className="text-sm text-coral hover:underline">
                {t("seeMentorPage")}
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold text-dark-slate mb-1">{t("underReview")}</p>
              <p className="text-sm text-dark-slate/60">{t("willReturn")}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/mentors"
        className="text-sm text-dark-slate/50 hover:text-seagrass mb-8 inline-block"
      >
        {t("backToMentors")}
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t("heading")}</h1>
        <p className="text-lg text-dark-slate/70">{t("intro")}</p>
      </div>

      <ApplyForm />
    </div>
  );
}
