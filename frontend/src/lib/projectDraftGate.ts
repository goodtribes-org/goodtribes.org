import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewDraft } from "@/lib/projectVisibility";

// 404s a draft (#226) for anyone who may not see it. The shared project
// layout uses it, and so does every generateMetadata under /projects/[slug]:
// a page's metadata is resolved even when its layout 404s, so without this
// a draft's title and description would still reach the browser. Cached per
// request, so the layout and the metadata share one lookup.
export const notFoundUnlessVisible = cache(async (slug: string): Promise<void> => {
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, publishedAt: true } });
  // A missing project is the page's own notFound(), as before.
  if (!project || project.publishedAt) return;
  const userId = (await auth())?.user?.id;
  if (!(await canViewDraft(project.id, userId))) notFound();
});
