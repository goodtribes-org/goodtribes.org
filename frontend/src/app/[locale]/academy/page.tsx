export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "GoodTribes Academy — GoodTribes.org",
  description: "Lär dig allt du behöver för att förändra världen",
};


const CATEGORIES = [
  { value: "", label: "Alla" },
  { value: "Projektledning", label: "Projektledning" },
  { value: "Crowdfunding", label: "Crowdfunding" },
  { value: "Community", label: "Community" },
  { value: "Teknik", label: "Teknik" },
  { value: "Impact", label: "Impact" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Projektledning: "bg-blue-100 text-blue-700",
  Crowdfunding:   "bg-amber-100 text-amber-700",
  Community:      "bg-purple-100 text-purple-700",
  Teknik:         "bg-cyan-100 text-cyan-700",
  Impact:         "bg-green-100 text-green-700",
};

const DIFFICULTY_BADGES: Record<string, { label: string; cls: string }> = {
  beginner:  { label: "Nybörjare",  cls: "bg-green-100 text-green-700" },
  avancerad: { label: "Avancerad",  cls: "bg-orange-100 text-orange-700" },
  advanced:  { label: "Avancerad",  cls: "bg-orange-100 text-orange-700" },
};

function difficultyBadge(difficulty: string) {
  const d = DIFFICULTY_BADGES[difficulty] ?? DIFFICULTY_BADGES.beginner;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${d.cls}`}>
      {d.label}
    </span>
  );
}

export default async function AcademyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const where = {
    published: true,
    hiddenAt: null,
    ...(category ? { category } : {}),
  };

  const [session, guides] = await Promise.all([
    auth(),
    prisma.academyGuide.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        _count: { select: { completions: true } },
      },
    }),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-slate">GoodTribes Academy</h1>
          <p className="text-sm text-dark-slate/60 mt-1 max-w-lg">
            Lär dig allt du behöver för att förändra världen
          </p>
        </div>
        {session?.user?.id && (
          <Link
            href="/academy/new"
            className="flex-shrink-0 px-4 py-2 bg-coral text-white text-sm font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            + Ny guide
          </Link>
        )}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => {
          const active = (category ?? "") === cat.value;
          const params = new URLSearchParams();
          if (cat.value) params.set("category", cat.value);
          const qs = params.toString();
          return (
            <Link
              key={cat.value}
              href={`/academy${qs ? `?${qs}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-seagrass text-white"
                  : "bg-dry-sage text-dark-slate/70 hover:bg-muted-teal/30 hover:text-dark-slate"
              }`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      {/* Guide grid */}
      {guides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-dark-slate/50">Inga guider publicerade ännu. Kom snart!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {guides.map((guide) => {
            const catCls = CATEGORY_COLORS[guide.category] ?? "bg-gray-100 text-gray-600";
            return (
              <div
                key={guide.id}
                className="rounded-xl border border-muted-teal/40 bg-white p-5 flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${catCls}`}>
                    {guide.category}
                  </span>
                  {difficultyBadge(guide.difficulty)}
                </div>

                <h2 className="text-base font-semibold text-dark-slate leading-snug mb-2">
                  {guide.title}
                </h2>

                <div className="flex items-center gap-3 text-xs text-dark-slate/50 mb-4 mt-auto">
                  <span>~{guide.readTimeMinutes} min</span>
                  <span>av {guide.author.name ?? "Okänd"}</span>
                  <span className="ml-auto">{guide._count.completions} avklarade</span>
                </div>

                <Link
                  href={`/academy/${guide.id}`}
                  className="self-start px-4 py-1.5 bg-seagrass text-white text-sm font-medium rounded-lg hover:bg-seagrass/80 transition-colors"
                >
                  Läs &rarr;
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
