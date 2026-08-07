export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isRealMember } from "@/lib/authz";
import { LEGAL_TYPES, LEGAL_TYPE_LABEL, isCommercialLegalType } from "@/lib/legalType";
import { canInvoice } from "@/lib/projectApproval";
import { proposeLegalTypeChange } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LegalTypePage" });
  return { title: t("pageTitle") };
}

export default async function LegalTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("LegalTypePage");
  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    approved_by_members: t("statusApprovedByMembers"),
    rejected_by_members: t("statusRejectedByMembers"),
    executed: t("statusExecuted"),
    rejected_by_foundation: t("statusRejectedByFoundation"),
  };
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      legalType: true,
      isSandbox: true,
      commercialUmbrellaEntityId: true,
      commercialUmbrellaEntity: { select: { name: true } },
    },
  });
  if (!project) notFound();

  const [pendingRequest, isMember] = await Promise.all([
    prisma.legalTypeChangeRequest.findFirst({
      where: { projectId: project.id, status: { in: ["pending", "approved_by_members"] } },
      orderBy: { createdAt: "desc" },
    }),
    userId ? isRealMember(project.id, userId) : Promise.resolve(false),
  ]);

  const eligibleForOwnAb = canInvoice(project);
  const otherTypes = LEGAL_TYPES.filter(
    (t) => t.value !== project.legalType && (t.value !== "COMMERCIAL_AB" || eligibleForOwnAb)
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href={`/projects/${slug}`} className="text-sm text-dark-slate/50 hover:text-seagrass">
          {t("backToProject", { title: project.title })}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/50 mt-1">{t("subtitle")}</p>
      </div>

      <section className="border border-muted-teal/40 rounded-lg p-5 bg-white mb-6">
        <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">{t("currentTypeLabel")}</p>
        <p className="text-lg font-medium text-dark-slate">{LEGAL_TYPE_LABEL[project.legalType] ?? project.legalType}</p>
        {project.commercialUmbrellaEntity && (
          <p className="text-sm text-dark-slate/50 mt-1">{t("productLineUnder", { name: project.commercialUmbrellaEntity.name })}</p>
        )}
      </section>

      {pendingRequest ? (
        <section className="border border-amber-300 bg-amber-50 rounded-lg p-5">
          <p className="text-sm font-medium text-dark-slate mb-1">
            {t("changeRequestTitle", { type: LEGAL_TYPE_LABEL[pendingRequest.requestedType] ?? pendingRequest.requestedType })}
          </p>
          <p className="text-sm text-amber-800">{STATUS_LABEL[pendingRequest.status] ?? pendingRequest.status}</p>
          {pendingRequest.pollId && (
            <Link
              href={`/projects/${slug}/polls/${pendingRequest.pollId}`}
              className="inline-block mt-2 text-sm text-seagrass hover:underline font-medium"
            >
              {t("viewPoll")}
            </Link>
          )}
        </section>
      ) : isMember ? (
        <section className="border border-muted-teal/40 rounded-lg p-5 bg-white">
          <p className="text-sm font-medium text-dark-slate mb-3">{t("proposeChangeHeading")}</p>
          <p className="text-xs text-dark-slate/50 mb-3">
            {t("proposeChangeDescription")}
          </p>
          {isCommercialLegalType(project.legalType) && !eligibleForOwnAb && (
            <p className="text-xs text-dark-slate/50 mb-3">
              {t("ownAbHint")}
            </p>
          )}
          <form action={proposeLegalTypeChange.bind(null, project.id, slug)} className="flex flex-col gap-3">
            <select
              name="requestedType"
              className="border border-muted-teal rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral"
            >
              {otherTypes.map((ot) => (
                <option key={ot.value} value={ot.value}>{ot.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="self-start bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors"
            >
              {t("startPoll")}
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-dark-slate/40">{t("membersOnlyNotice")}</p>
      )}
    </div>
  );
}
