export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

import Pagination from "@/components/Pagination";
import { CATEGORY_META, PRIORITY_META, formatDate } from "@/components/kanbanShared";

export const metadata: Metadata = {
  title: "Öppna uppgifter — GoodTribes.org",
  description: "Ta dig an en enskild, avgränsad uppgift på ett projekt — utan att gå med i projektet.",
};

const PAGE_SIZE = 12;

export default async function MicroTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);

  const where: Prisma.KanbanCardWhereInput = {
    openToPublic: true,
    assigneeId: null,
    column: { not: "DONE" },
    project: { visibility: "public" },
    ...(category ? { category } : {}),
  };

  const [total, cards] = await Promise.all([
    prisma.kanbanCard.count({ where }),
    prisma.kanbanCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        project: { select: { slug: true, title: true, imageUrl: true } },
        estimate: true,
      },
    }),
  ]);

  const rawParams = { category, page: pageStr };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-dark-slate">
          Öppna uppgifter{" "}
          <span className="text-dark-slate/40 font-normal">({total})</span>
        </h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Ta dig an en enskild uppgift på ett projekt — inget medlemskap krävs. Perfekt om du vill bidra en gång utan att binda dig.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link
          href="/micro-tasks"
          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
            !category ? "border-gray-400 bg-gray-100 text-gray-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
        >
          Alla
        </Link>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <Link
            key={key}
            href={`/micro-tasks?category=${key}`}
            style={category === key ? { backgroundColor: meta.hex + "22", borderColor: meta.hex, color: meta.hex } : {}}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              category === key ? "" : "border-gray-200 text-gray-400 hover:border-gray-300"
            }`}
          >
            {meta.label}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50 mb-4">Inga öppna uppgifter just nu.</p>
          {category && (
            <Link href="/micro-tasks" className="text-coral hover:underline text-sm">
              Rensa filter
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {cards.map((card) => {
              const priorityMeta = PRIORITY_META[card.priority] ?? PRIORITY_META.normal;
              const categoryMeta = card.category ? CATEGORY_META[card.category] : null;
              return (
                <Link
                  key={card.id}
                  href={`/projects/${card.project.slug}/tasks?card=${card.id}`}
                  className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all overflow-hidden"
                >
                  {categoryMeta && <div className="h-1" style={{ backgroundColor: categoryMeta.hex }} />}
                  <div className="p-4">
                    <p className="text-xs font-medium text-seagrass truncate">{card.project.title}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1 leading-snug">{card.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${priorityMeta.dot}`} />
                      <span className="text-xs text-gray-400">{priorityMeta.label}</span>
                      {card.estimate?.aiHours != null && (
                        <span className="text-xs text-gray-400">· ~{card.estimate.aiHours}h</span>
                      )}
                      {card.dueDate && (
                        <span className="text-xs text-gray-400">· {formatDate(card.dueDate)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination
            page={page}
            total={total}
            perPage={PAGE_SIZE}
            searchParams={rawParams}
            basePath="/micro-tasks"
          />
        </>
      )}
    </div>
  );
}
