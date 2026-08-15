import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { isCommercialLegalType } from "@/lib/legalType";

// Feeds ProjectChrome on pages outside /projects/[slug] (e.g. /messages?project=...)
// that still need the project sidebar + mini hero. Public, same info already
// visible on the project page to anyone.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, title: true, slogan: true, imageUrl: true, legalType: true, createdAt: true, isSandbox: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Projekt hittades inte" }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const dateLabel = `${project.createdAt.getDate()}/${project.createdAt.getMonth() + 1}-${String(project.createdAt.getFullYear()).slice(-2)}`;

  return NextResponse.json({
    title: project.title,
    slogan: project.slogan,
    imageUrl: project.imageUrl,
    isOwner,
    isCommercial: isCommercialLegalType(project.legalType),
    dateLabel,
    isSandbox: project.isSandbox,
  });
}
