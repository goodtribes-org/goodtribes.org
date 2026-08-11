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

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ExclusionCasesPage" });
  return buildMetadata({ locale, path: "/granskningsradet/arenden", title: t("pageTitle") });
}

export default async function ExclusionCasesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [session, t] = await Promise.all([
    auth(),
    getTranslations({ locale, namespace: "ExclusionCasesPage" }),
  ]);
  if (!session?.user?.id) redirect("/login");
  if (!(await isCouncilMember(session.user.id))) notFound();

  const STATUS_LABEL: Record<string, string> = {
    open: t("statusOpen"),
    under_review: t("statusUnderReview"),
    resolved: t("statusResolved"),
  };

  const cases = await prisma.exclusionCase.findMany({
    where: { status: { in: ["open", "under_review"] } },
    orderBy: { createdAt: "asc" },
    include: {
      reportedUser: { select: { name: true } },
      reportedBy: { select: { name: true } },
      project: { select: { title: true } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/granskningsradet" className="text-sm text-dark-slate/50 hover:text-dark-slate">
          {t("backToCouncil")}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">{t("heading")}</h1>
        <p className="text-sm text-dark-slate/50 mt-1">{t("caseCount", { count: cases.length })}</p>
      </div>

      {cases.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-lg p-12 text-center">
          <p className="text-dark-slate/40 text-sm">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/granskningsradet/arenden/${c.id}`}
              className="flex items-center justify-between gap-3 border border-muted-teal/40 rounded-lg p-4 hover:shadow-md hover:border-muted-teal transition-all bg-white"
            >
              <div className="min-w-0">
                <p className="font-medium text-dark-slate">
                  {c.reportedUser.name ?? t("unknownUser")} {c.project && <span className="text-dark-slate/40">· {c.project.title}</span>}
                </p>
                <p className="text-xs text-dark-slate/40 mt-0.5 truncate">{c.reason}</p>
              </div>
              <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
