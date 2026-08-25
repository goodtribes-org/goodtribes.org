import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import OwnerTransferPanel from "./OwnerTransferPanel";

// Site-admin never needs project membership to reach this page — the
// site-admin/layout.tsx guard already requires isSiteAdmin, and
// transferOwnership() (ownership-actions.ts) already permits a site-admin
// to call it directly, same as an existing founder/lead.
export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "SiteAdminProjectDetail" });

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      owner: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (!project) notFound();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Link href="/site-admin/projects" className="text-xs text-dark-slate/50 hover:text-coral">
        ← {t("backLink")}
      </Link>
      <div className="mt-2 mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">{project.title}</h1>
        <Link href={`/projects/${project.slug}`} className="text-sm text-dark-slate/50 hover:text-coral">
          {t("viewProjectLink")}
        </Link>
      </div>

      <OwnerTransferPanel slug={project.slug} currentOwner={project.owner} />
    </div>
  );
}
