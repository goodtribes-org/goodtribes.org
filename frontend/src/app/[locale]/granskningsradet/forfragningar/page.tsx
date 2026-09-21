export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isCouncilMember } from "@/lib/authz";
import { buildMetadata } from "@/lib/metadata";
import type { Locale } from "next-intl";
import RequestActions from "./RequestActions";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReviewCouncilRequestsPage" });
  return buildMetadata({ locale, path: "/granskningsradet/forfragningar", title: t("pageTitle") });
}

export default async function ReviewCouncilRequestsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ReviewCouncilRequestsPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");
  if (!(await isCouncilMember(session.user.id))) notFound();

  const STATUS_LABEL: Record<string, string> = {
    pending: t("statusPending"),
    in_review: t("statusInReview"),
  };

  const requests = await prisma.reviewCouncilRequest.findMany({
    where: { status: { in: ["pending", "in_review"] } },
    orderBy: { createdAt: "asc" },
    include: {
      requestedBy: { select: { name: true } },
      project: { select: { title: true, slug: true } },
      assignedCouncilMember: { select: { name: true, id: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/granskningsradet" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("backToCouncil")}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/50 mt-1">{t("requestCount", { count: requests.length })}</p>
      </div>

      {requests.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-12 text-center">
          <p className="text-dark-slate/40 text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="border border-muted-teal/40 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-dark-slate">
                    <Link href={`/projects/${r.project.slug}`} className="hover:underline">
                      {r.project.title}
                    </Link>
                  </p>
                  <p className="text-xs text-dark-slate/40 mt-0.5">
                    {t("requestedBy", { name: r.requestedBy.name ?? t("unknownUser") })}
                  </p>
                </div>
                <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              {r.note && <p className="text-sm text-dark-slate/70 mb-2">{r.note}</p>}
              <RequestActions
                requestId={r.id}
                isAssignedToMe={r.assignedCouncilMemberId === session.user.id}
                assignedToName={r.assignedCouncilMember?.name ?? null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
