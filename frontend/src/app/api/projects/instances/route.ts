import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"


function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { parentSlug, region, country, projectTitle } = body as {
    parentSlug?: string;
    region?: string;
    country?: string;
    projectTitle?: string;
  };
  if (!parentSlug || !region || !country || !projectTitle) {
    return NextResponse.json({ error: "parentSlug, region, country och projectTitle krävs" }, { status: 400 });
  }

  const parent = await prisma.project.findUnique({ where: { slug: parentSlug } });
  if (!parent) return NextResponse.json({ error: "Förälderprojekt hittades inte" }, { status: 404 });
  if (!parent.openForReplication) {
    return NextResponse.json({ error: "Projektet är inte öppet för replikering" }, { status: 403 });
  }

  // Check maturity score
  const maturity = await prisma.projectMaturity.findUnique({ where: { projectSlug: parentSlug } });
  if (!maturity || maturity.score < 70) {
    return NextResponse.json({ error: "Projektet har inte tillräcklig mognad" }, { status: 403 });
  }

  // Generate a unique slug for the child project
  const baseSlug = slugify(projectTitle);
  let childSlug = baseSlug;
  let attempt = 0;
  while (await prisma.project.findUnique({ where: { slug: childSlug } })) {
    attempt++;
    childSlug = `${baseSlug}-${attempt}`;
  }

  // Create the child project as a copy of the parent with the new owner
  const child = await prisma.project.create({
    data: {
      slug: childSlug,
      title: projectTitle,
      description: parent.description,
      phase: "IDEA",
      visibility: parent.visibility,
      category: parent.category,
      tags: parent.tags,
      imageUrl: parent.imageUrl,
      sdgGoals: parent.sdgGoals,
      ownerId: session.user!.id,
      orgId: null,
    },
  });

  // Add the user as owner-role member of the child project
  await prisma.projectMember.create({
    data: {
      projectId: child.id,
      userId: session.user!.id,
      role: "FOUNDER",
    },
  });

  // Create the ProjectInstance link
  await prisma.projectInstance.create({
    data: {
      parentSlug,
      childSlug,
      region,
      country,
      status: "pending",
    },
  });

  return NextResponse.json({ childSlug, status: "pending" });
}
