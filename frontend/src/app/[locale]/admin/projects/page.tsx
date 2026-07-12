import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { setProjectVisibility, deleteProjectAsAdmin } from "./actions";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const projects = await prisma.project.findMany({
    where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
    select: {
      slug: true,
      title: true,
      visibility: true,
      _count: { select: { flags: true, members: true } },
    },
    orderBy: { title: "asc" },
    take: 50,
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate">Projekt</h1>
        <p className="text-sm text-dark-slate/60 mt-1">
          Dölj eller ta bort projekt som bryter mot GoodTribes regler.
        </p>
      </div>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Sök projekt…"
          className="w-full max-w-sm border border-muted-teal/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
        />
      </form>

      <div className="border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15">
        {projects.map((p) => (
          <div key={p.slug} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <Link href={`/projects/${p.slug}`} className="text-sm font-medium text-dark-slate hover:text-coral truncate">
                {p.title}
              </Link>
              <p className="text-xs text-dark-slate/40">
                {p._count.members} medlemmar
                {p._count.flags > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">{p._count.flags} flaggor</span>
                )}
              </p>
            </div>
            <span className="text-xs text-dark-slate/50">{p.visibility}</span>
            <form
              action={async () => {
                "use server";
                await setProjectVisibility(p.slug, p.visibility === "public" ? "private" : "public");
              }}
            >
              <button
                type="submit"
                className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-dark-slate/70 hover:border-amber-400 hover:text-amber-700 transition-colors"
              >
                {p.visibility === "public" ? "Dölj" : "Gör publik"}
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteProjectAsAdmin(p.slug);
              }}
            >
              <button
                type="submit"
                className="text-xs font-medium px-2 py-1 rounded-md border border-gray-200 text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
              >
                Ta bort
              </button>
            </form>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">Inga projekt hittades.</p>
        )}
      </div>
    </div>
  );
}
