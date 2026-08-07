import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { createWikiPage } from "./actions";
import type { Metadata } from "next";
import { isLeadRole } from "@/lib/authz";


export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const [project, t] = await Promise.all([
    prisma.project.findUnique({ where: { slug }, select: { title: true } }),
    getTranslations({ locale, namespace: "WikiPage" }),
  ]);
  if (!project) return {};
  return { title: t("pageTitle", { projectTitle: project.title }) };
}

export default async function WikiIndexPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "WikiPage" });

  const project = await prisma.project.findUnique({
    where: { slug },
    include: { wikiPages: { where: { hiddenAt: null }, orderBy: { order: "asc" } } },
  });
  if (!project) notFound();

  // Redirect to first page if any exist
  if (project.wikiPages.length > 0) {
    redirect(`/projects/${slug}/wiki/${project.wikiPages[0].slug}`);
  }

  const session = await auth();
  const member = session?.user?.id
    ? await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
      })
    : null;
  const isOwnerOrAdmin = isLeadRole(member?.role);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
          {t("backToProject", { title: project.title })}
        </Link>
        <h1 className="text-xl font-bold text-dark-slate mt-0.5">{t("heading")}</h1>
      </div>

      {isOwnerOrAdmin ? (
        <div>
          <p className="text-sm text-dark-slate/60 mb-6">{t("emptyStateOwner")}</p>
          <form action={createWikiPage.bind(null, slug)} className="space-y-3 border border-muted-teal/30 rounded-lg p-4">
            <input
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue="Home"
              placeholder={t("titlePlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            />
            <textarea
              name="content"
              rows={8}
              placeholder={t("contentPlaceholder")}
              className="w-full border border-muted-teal rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
            />
            <button type="submit" className="bg-coral text-white text-sm font-medium px-4 py-2 rounded hover:bg-watermelon transition-colors">
              {t("createButton")}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-dark-slate/40 py-8 text-center">{t("emptyState")}</p>
      )}
    </div>
  );
}
