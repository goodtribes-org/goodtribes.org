export const dynamic = "force-dynamic";

import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import PhaseWorksheetForm from "@/components/PhaseWorksheetForm";
import { updateEstablishmentPlan } from "./actions";
import type { Locale } from "next-intl";

const TEXT_FIELDS = ["scaledProcessNotes", "supporterBaseNotes"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await notFoundUnlessVisible(slug);
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Etableringsplan` };
}

export default async function EstablishmentPlanPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "EstablishmentPlanPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, establishmentPlan: true },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;

  const values: Record<string, string | null> = {
    scaledProcessNotes: project.establishmentPlan?.scaledProcessNotes ?? null,
    supporterBaseNotes: project.establishmentPlan?.supporterBaseNotes ?? null,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark-slate">{t("title")}</h1>
      </div>

      <PhaseWorksheetForm
        projectSlug={slug}
        namespace="EstablishmentPlanForm"
        textFields={TEXT_FIELDS}
        values={values}
        canEdit={canEdit}
        action={updateEstablishmentPlan}
      />
    </div>
  );
}
