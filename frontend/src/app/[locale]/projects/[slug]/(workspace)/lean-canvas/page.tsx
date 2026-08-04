export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import LeanCanvasGrid from "./LeanCanvasGrid";
import LeanCanvasComments from "./LeanCanvasComments";
import LeanCanvasHistory from "./LeanCanvasHistory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Lean Canvas — GoodTribes.org` };
}

export default async function LeanCanvasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      leanCanvas: { include: { updatedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const canComment = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;
  const canvas = project.leanCanvas;

  const helpGuide = await prisma.academyGuide.findFirst({
    where: { title: "Så använder du Lean Canvas", published: true },
    select: { id: true },
  });
  const helpHref = helpGuide ? `/academy/${helpGuide.id}` : "/academy?category=Projektledning";

  const comments = await prisma.leanCanvasComment.findMany({
    where: { projectSlug: slug, hiddenAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark-slate">Lean Canvas</h1>
        <div className="flex items-center gap-4">
          <LeanCanvasHistory projectSlug={slug} />
          <Link
            href={helpHref}
            className="flex items-center gap-1 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors"
          >
            <span className="flex items-center justify-center w-4 h-4 rounded-full border border-current text-[10px]">?</span>
            Hjälp
          </Link>
        </div>
      </div>

      <LeanCanvasGrid projectSlug={slug} canvas={canvas} canEdit={canEdit} />

      <LeanCanvasComments
        projectSlug={slug}
        comments={comments}
        canComment={canComment}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
