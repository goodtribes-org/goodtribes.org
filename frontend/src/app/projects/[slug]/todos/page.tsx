import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import Link from "next/link";
import type { Metadata } from "next";
import TodoPage from "@/components/TodoPage";

const prisma = new PrismaClient();

const PROJECTS = [
  { slug: "kickfix", name: "Kickfix" },
  { slug: "asylguiden-se", name: "Asylguiden.se" },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  return { title: `${project.name} — To-dos — GoodTribes.org` };
}

export default async function TodosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const session = await auth();

  const lists = await prisma.todoList.findMany({
    where: { projectSlug: slug },
    orderBy: { order: "asc" },
    include: {
      createdBy: { select: { name: true } },
      items: {
        orderBy: { order: "asc" },
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  return (
    <>
      <div className="mb-6">
        <Link
          href={`/projects/${slug}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate mt-1">{project.name}</h1>
      </div>
      <TodoPage
        projectSlug={slug}
        initialLists={lists}
        isLoggedIn={!!session?.user?.id}
        currentUserId={session?.user?.id ?? null}
      />
    </>
  );
}
