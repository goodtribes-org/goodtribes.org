import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma"
import { indexDocuments } from "@/lib/meili";


export async function POST() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, ideas, users] = await Promise.all([
    prisma.project.findMany({
      where: { visibility: "public" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.idea.findMany({
      include: {
        author: { select: { name: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.user.findMany({
      where: { showProfile: true },
    }),
  ]);

  await Promise.all([
    indexDocuments(
      "projects",
      projects.map((p) => ({
        id: `project-${p.slug}`,
        type: "project",
        title: p.title,
        description: p.description ?? "",
        url: `/projects/${p.slug}`,
        status: p.status,
        sdgGoals: p.sdgGoals,
        ownerName: p.owner.name ?? "",
      }))
    ),
    indexDocuments(
      "ideas",
      ideas.map((i) => ({
        id: `idea-${i.id}`,
        type: "idea",
        title: i.title,
        description: i.description ?? "",
        url: `/ideas/${i.id}`,
        authorName: i.author.name ?? "",
        votes: i._count.votes,
      }))
    ),
    indexDocuments(
      "members",
      users.map((u) => ({
        id: `member-${u.id}`,
        type: "member",
        title: u.name ?? "",
        description: u.bio ?? "",
        url: `/members/${u.id}`,
      }))
    ),
  ]);

  return NextResponse.json({
    synced: {
      projects: projects.length,
      ideas: ideas.length,
      members: users.length,
    },
  });
}
