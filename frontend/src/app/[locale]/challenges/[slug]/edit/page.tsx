import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageChallenges } from "@/lib/challenges";
import ChallengeForm from "@/components/challenges/ChallengeForm";

export default async function EditChallengePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    include: { organisation: { select: { id: true, verified: true } } },
  });
  if (!challenge || !(await canManageChallenges(challenge.organisation, (await auth())?.user?.id))) notFound();
  const t = await getTranslations({ locale, namespace: "ChallengeForm" });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-dark-slate">{t("editHeading")}</h1>
      <ChallengeForm
        slug={slug}
        initial={{
          title: challenge.title,
          description: challenge.description ?? "",
          supportText: challenge.supportText ?? "",
          closesOn: challenge.closesAt.toISOString().slice(0, 10),
          imageUrl: challenge.imageUrl ?? "",
        }}
      />
    </div>
  );
}
