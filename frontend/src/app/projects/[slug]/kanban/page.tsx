import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import KanbanBoard from "@/components/KanbanBoard";
import Link from "next/link";
import type { Metadata } from "next";

const prisma = new PrismaClient();

const PROJECTS = [
  { slug: "kickfix", name: "Kickfix" },
  { slug: "asylguiden-se", name: "Asylguiden.se" },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  return { title: `${project.name} — Kanban — GoodTribes.org` };
}

export default async function KanbanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const session = await auth();

  const cards = await prisma.kanbanCard.findMany({
    where: { projectSlug: slug },
    orderBy: [{ column: "asc" }, { order: "asc" }],
    include: { createdBy: { select: { name: true } } },
  });

  const columns = {
    BACKLOG: cards.filter((c) => c.column === "BACKLOG"),
    TODO:    cards.filter((c) => c.column === "TODO"),
    DOING:   cards.filter((c) => c.column === "DOING"),
    REVIEW:  cards.filter((c) => c.column === "REVIEW"),
    DONE:    cards.filter((c) => c.column === "DONE"),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">{project.name}</h1>
      </div>
      <KanbanBoard
        projectSlug={slug}
        initialColumns={columns}
        isLoggedIn={!!session?.user?.id}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
