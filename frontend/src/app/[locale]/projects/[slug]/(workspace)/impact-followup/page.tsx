export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import PhaseWorksheetForm from "@/components/PhaseWorksheetForm";
import { updateImpactFollowup } from "./actions";
import type { Locale } from "next-intl";

const TEXT_FIELDS = ["externalVerificationNotes", "celebrationNotes"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Impact-uppföljning — GoodTribes.org` };
}

export default async function ImpactFollowupPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ImpactFollowupPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, impactFollowup: true },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  const values: Record<string, string | null> = {
    externalVerificationNotes: project.impactFollowup?.externalVerificationNotes ?? null,
    celebrationNotes: project.impactFollowup?.celebrationNotes ?? null,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark-slate">{t("title")}</h1>
      </div>

      <PhaseWorksheetForm
        projectSlug={slug}
        namespace="ImpactFollowupForm"
        textFields={TEXT_FIELDS}
        values={values}
        decision={{
          key: "nextStepDecision",
          value: project.impactFollowup?.nextStepDecision ?? "UNDECIDED",
          options: [
            { value: "UNDECIDED", labelKey: "decisionUndecided" },
            { value: "CONTINUE", labelKey: "decisionContinue" },
            { value: "REPLICATE", labelKey: "decisionReplicate" },
            { value: "CLOSE_RESPONSIBLY", labelKey: "decisionCloseResponsibly" },
          ],
        }}
        canEdit={canEdit}
        action={updateImpactFollowup}
      />
    </div>
  );
}
