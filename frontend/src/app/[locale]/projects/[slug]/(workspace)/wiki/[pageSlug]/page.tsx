import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { updateWikiPage, deleteWikiPage, createWikiPage } from "../actions";
import WikiEditor from "./WikiEditor";
import type { Metadata } from "next";
import { isLeadRole } from "@/lib/authz";
import { buildMetadata, APP_URL } from "@/lib/metadata";
import ShareButton from "@/components/ShareButton";
import FlagContentButton from "@/components/FlagContentButton";
import LikeCommentBlock from "@/components/LikeCommentBlock";
import { getLikeCommentData } from "@/lib/socialInteractions";


export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string; pageSlug: string }> }): Promise<Metadata> {
  const { locale, slug, pageSlug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: pageSlug } } });
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!page || !project) return {};
  return buildMetadata({
    locale,
    path: `/projects/${slug}/wiki/${pageSlug}`,
    title: `${page.title} — ${project.title} Wiki`,
    description: page.content.slice(0, 160),
  });
}

function renderMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3 class="text-base font-bold mt-4 mb-1">${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2 class="text-lg font-bold mt-5 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1 class="text-xl font-bold mt-6 mb-2">${line.slice(2)}</h1>`;
      if (line.startsWith("- ") || line.startsWith("* ")) return `<li class="ml-4 list-disc text-sm">${line.slice(2)}</li>`;
      if (line.trim() === "") return `<div class="h-3" />`;
      return `<p class="text-sm leading-relaxed text-dark-slate/80">${line}</p>`;
    })
    .join("");
}

export default async function WikiPageView({ params }: { params: Promise<{ locale: string; slug: string; pageSlug: string }> }) {
  const { locale, slug, pageSlug } = await params;

  const [project, page, session] = await Promise.all([
    prisma.project.findUnique({
      where: { slug },
      include: { wikiPages: { where: { hiddenAt: null }, orderBy: { order: "asc" }, select: { slug: true, title: true } } },
    }),
    prisma.wikiPage.findUnique({
      where: { projectSlug_slug: { projectSlug: slug, slug: pageSlug } },
      include: { updatedBy: { select: { name: true } } },
    }),
    auth(),
  ]);

  if (!project || !page) notFound();

  const member = session?.user?.id
    ? await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } },
      })
    : null;
  const isMember = !!member;
  const isOwnerOrAdmin = isLeadRole(member?.role);

  // A moderation-hidden page (see ContentFlag/contentModeration.ts) stays
  // visible to project leads, 404s for everyone else.
  if (page.hiddenAt && !isOwnerOrAdmin) notFound();

  const { comments } = await getLikeCommentData("wikiPage", page.id, session?.user?.id ?? null);

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-44 shrink-0">
        <div className="mb-3">
          <Link href={`/projects/${slug}`} className="text-xs text-dark-slate/40 hover:text-dark-slate">
            ← {project.title}
          </Link>
          <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wider mt-3 mb-2">Wiki</p>
        </div>
        <ul className="space-y-0.5">
          {project.wikiPages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/projects/${slug}/wiki/${p.slug}`}
                className={`block text-sm px-2 py-1 rounded transition-colors truncate ${
                  p.slug === pageSlug
                    ? "bg-coral/10 text-coral font-medium"
                    : "text-dark-slate/70 hover:text-dark-slate hover:bg-gray-50"
                }`}
              >
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
        {isOwnerOrAdmin && (
          <form action={createWikiPage.bind(null, slug)} className="mt-4">
            <input name="title" type="text" required placeholder="New page…"
              className="w-full text-xs border border-muted-teal/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coral placeholder-dark-slate/30"
            />
            <input type="hidden" name="content" value="" />
          </form>
        )}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-end gap-3 mb-2">
          <ShareButton
            url={`${APP_URL}/${locale}/projects/${slug}/wiki/${pageSlug}`}
            title={`${page.title} — ${project.title} Wiki`}
            variant="icon"
          />
          {session?.user?.id && (
            <FlagContentButton targetType="WikiPage" targetId={page.id} />
          )}
        </div>
        <WikiEditor
          page={{ id: page.id, title: page.title, content: page.content }}
          projectSlug={slug}
          canEdit={isMember}
          canDelete={!!isOwnerOrAdmin}
          renderedHtml={renderMarkdown(page.content)}
          updateAction={updateWikiPage}
          deleteAction={deleteWikiPage}
        />
        {page.updatedBy && (
          <p className="text-xs text-dark-slate/30 mt-6">
            Last edited by {page.updatedBy.name}
          </p>
        )}

        <div className="border-t border-muted-teal/30 pt-4 mt-6">
          <LikeCommentBlock
            targetType="wikiPage"
            targetId={page.id}
            hideLike
            isLoggedIn={!!session?.user?.id}
            initialLikeCount={0}
            initialLiked={false}
            initialComments={comments}
          />
        </div>
      </div>
    </div>
  );
}
