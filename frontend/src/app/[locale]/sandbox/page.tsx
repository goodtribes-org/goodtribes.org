export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAiParticipantUser } from "@/lib/aiParticipant";
import { htmlToPreviewText } from "@/lib/renderBody";
import SortToggleContainer from "@/components/SortToggleContainer";
import Pagination from "@/components/Pagination";
import ProjectCard from "@/components/ProjectCard";
import SandboxHero from "./SandboxHero";

export const metadata: Metadata = {
  title: "Sandbox — GoodTribes.org",
  description: "Ett experimentellt område som blandar AI-genererat innehåll med användarbidrag.",
};

const PAGE_SIZE = 12;

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just nu";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min sedan`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} tim sedan`;
  return `${Math.floor(h / 24)} dagar sedan`;
}

export default async function SandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { sort: sortParam, page: pageStr } = await searchParams;
  const sort = sortParam === "top" ? "top" : sortParam === "trending" ? "trending" : "new";
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const orderBy =
    sort === "top"       ? { members: { _count: "desc" as const } }
    : sort === "trending" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };

  const where = { isSandbox: true };
  const aiUser = await getAiParticipantUser();

  const [total, projects, recentMessages, projectCount, aiSeedCount, tasksDone] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
    prisma.message.findMany({
      where: { room: { project: { isSandbox: true } }, hiddenAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true } },
        room: { select: { project: { select: { slug: true, title: true } } } },
      },
    }),
    prisma.project.count({ where }),
    prisma.project.count({ where: { isSandbox: true, ownerId: aiUser.id } }),
    prisma.kanbanCard.count({ where: { column: "DONE", project: { isSandbox: true } } }),
  ]);

  const [projectLikeCounts, doneTaskCounts] = await Promise.all([
    projects.length
      ? prisma.feedLike.groupBy({
          by: ["targetId"],
          where: { targetType: "project", targetId: { in: projects.map((p) => p.id) } },
          _count: true,
        })
      : Promise.resolve([]),
    projects.length
      ? prisma.kanbanCard.groupBy({
          by: ["projectSlug"],
          where: { projectSlug: { in: projects.map((p) => p.slug) }, column: "DONE" },
          _count: true,
        })
      : Promise.resolve([]),
  ]);
  const likesByProjectId = new Map(projectLikeCounts.map((g) => [g.targetId, g._count]));
  const doneTasksBySlug = new Map(doneTaskCounts.map((g) => [g.projectSlug, g._count]));
  const projectsWithLikes = projects.map((p) => ({
    ...p,
    likes: likesByProjectId.get(p.id) ?? 0,
    kanbanCardsDone: doneTasksBySlug.get(p.slug) ?? 0,
  }));

  const rawParams = { sort: sortParam, page: pageStr };

  return (
    <div className="relative -mt-8 -mb-12" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw", backgroundColor: "#f8f8f8" }}>
    <SandboxHero />
    <div className="max-w-6xl mx-auto px-6 pb-12">
      <div className="flex items-center justify-between mb-6 mt-2">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">Sandbox</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            Testa en idé fritt — samma projektverktyg, bara friare.
          </p>
        </div>
        <Link
          href="/sandbox/new"
          className="px-4 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors flex-shrink-0"
        >
          + Nytt sandbox-projekt
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-dark-slate">{projectCount}</p>
          <p className="text-[11px] text-dark-slate/50">Sandbox-projekt</p>
        </div>
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-dark-slate">{aiSeedCount}</p>
          <p className="text-[11px] text-dark-slate/50">AI-startade</p>
        </div>
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-dark-slate">{projectCount - aiSeedCount}</p>
          <p className="text-[11px] text-dark-slate/50">Mänskligt startade</p>
        </div>
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-dark-slate">{tasksDone}</p>
          <p className="text-[11px] text-dark-slate/50">Uppgifter avklarade</p>
        </div>
      </div>

      <section id="projects" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-dark-slate">
            Utforska sandbox <span className="text-dark-slate/40 font-normal">({total})</span>
          </h2>
          <SortToggleContainer sort={sort} basePath="/sandbox" />
        </div>
        {projectsWithLikes.length === 0 ? (
          <div className="border border-dashed border-amber-300 rounded-lg p-16 text-center">
            <p className="text-dark-slate/40 text-sm mb-3">Inga sandbox-projekt ännu.</p>
            <Link href="/sandbox/new" className="text-coral hover:underline text-sm">
              Starta det första →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projectsWithLikes.map((p) => <ProjectCard key={p.slug} project={p} variant="sandbox" />)}
            </div>
            <Pagination page={page} total={total} perPage={PAGE_SIZE} searchParams={rawParams} basePath="/sandbox" />
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-dark-slate mb-4">Senaste i sandboxen</h2>
        {recentMessages.length === 0 ? (
          <p className="text-sm text-dark-slate/40">Inga inlägg ännu.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentMessages.map((m) => (
              <Link
                key={m.id}
                href={m.room.project ? `/projects/${m.room.project.slug}` : "/sandbox"}
                className="flex items-start gap-3 border border-amber-200 bg-amber-50/30 rounded-lg p-3 hover:border-amber-400 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-dark-slate/50 mb-0.5">
                    <span className="font-medium text-dark-slate">{m.author.name ?? "Okänd"}</span>
                    {" i "}
                    <span className="text-amber-700">{m.room.project?.title ?? "ett sandbox-projekt"}</span>
                  </p>
                  <p className="text-sm text-dark-slate/80 line-clamp-2">{htmlToPreviewText(m.body)}</p>
                </div>
                <span className="text-[11px] text-dark-slate/40 flex-shrink-0">{timeAgo(m.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
