export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import RequestReviewForm from "./RequestReviewForm";
import type { Locale } from "next-intl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Granskningsråd — GoodTribes.org` };
}

export default async function ReviewRequestPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ReviewRequestPage" }),
  ]);

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      reviewCouncilRequests: {
        orderBy: { createdAt: "desc" },
        include: { assignedCouncilMember: { select: { name: true } } },
      },
    },
  });
  if (!project) return null;

  const canRequest = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const hasActiveRequest = project.reviewCouncilRequests.some(
    (r) => r.status === "pending" || r.status === "in_review"
  );

  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    in_review: t("statusInReview"),
    completed: t("statusCompleted"),
    declined: t("statusDeclined"),
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-dark-slate mb-1">{t("title")}</h1>
      <p className="text-sm text-dark-slate/50 mb-6">{t("intro")}</p>

      {canRequest && !hasActiveRequest && <RequestReviewForm projectSlug={slug} />}

      {project.reviewCouncilRequests.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-8 text-center mt-4">
          <p className="text-dark-slate/40 text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {project.reviewCouncilRequests.map((r) => (
            <div key={r.id} className="border border-muted-teal/40 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className="text-xs text-dark-slate/40">
                  {new Date(r.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
              {r.note && <p className="text-sm text-dark-slate/70 mt-2">{r.note}</p>}
              {r.assignedCouncilMember && (
                <p className="text-xs text-dark-slate/40 mt-2">
                  {t("assignedTo", { name: r.assignedCouncilMember.name ?? t("unknownUser") })}
                </p>
              )}
              {r.outcomeNote && (
                <p className="text-sm text-dark-slate/70 mt-2 border-t border-muted-teal/20 pt-2">
                  {r.outcomeNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
