import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageChallenges } from "@/lib/challenges";
import ChallengeForm from "@/components/challenges/ChallengeForm";

// A verified organisation's leads start a challenge here (#228).
export default async function NewChallengePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const org = await prisma.organisation.findUnique({ where: { slug }, select: { id: true, name: true, verified: true } });
  if (!org || !(await canManageChallenges(org, (await auth())?.user?.id))) notFound();
  const t = await getTranslations({ locale, namespace: "ChallengeForm" });

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{org.name}</p>
      <h1 className="mt-1 text-2xl font-bold text-dark-slate">{t("newHeading")}</h1>
      <p className="mb-6 mt-2 text-sm text-dark-slate/70">{t("newIntro")}</p>
      <ChallengeForm orgSlug={slug} />
    </div>
  );
}
