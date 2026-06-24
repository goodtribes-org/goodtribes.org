import { notFound } from "next/navigation";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { updateWikiPage, deleteWikiPage, createWikiPage } from "../actions";
import WikiEditor from "./WikiEditor";
import type { Metadata } from "next";

const prisma = new PrismaClient();

export async function generateMetadata({ params }: { params: Promise<{ slug: string; pageSlug: string }> }): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const page = await prisma.wikiPage.findUnique({ where: { projectSlug_slug: { projectSlug: slug, slug: pageSlug } } });
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!page || !project) return {};
  return { title: `${page.title} — ${project.title} Wiki — GoodTribes.org` };
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

export default async function WikiPageView({ params }: { params: Promise<{ slug: string; pageSlug: string }> }) {
  const { slug, pageSlug } = await params;

  const [project, page, session] = await Promise.all([
    prisma.project.findUnique({
      where: { slug },
      include: { wikiPages: { orderBy: { order: "asc" }, select: { slug: true, title: true } } },
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
  const isOwnerOrAdmin = member && ["owner", "admin"].includes(member.role);

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
      </div>
    </div>
  );
}
