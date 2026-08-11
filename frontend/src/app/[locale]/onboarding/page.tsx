import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import OnboardingWizard from "./OnboardingWizard";
import type { Metadata } from "next";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OnboardingPage" });
  return buildMetadata({ locale, path: "/onboarding", title: t("pageTitle") });
}

export default async function OnboardingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "OnboardingPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true },
  });

  if (user?.onboardingDone) redirect("/workplace");

  return (
    <main className="min-h-screen bg-warm-white py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-dark-slate mb-2">
            {t("heading")}
          </h1>
          <p className="text-dark-slate/60">{t("intro")}</p>
        </div>
        <OnboardingWizard />
      </div>
    </main>
  );
}
