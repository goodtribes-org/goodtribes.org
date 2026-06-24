export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FEATURE_CARDS = [
  {
    image: "/img/want-a-change.png",
    title: "Want a change?",
    description: "Do you want to see a change and to be a part of making a better world?",
    objectPosition: "right center",
  },
  {
    image: "/img/do-you-have-a-dream.png",
    title: "Do you have a dream?",
    description: "Do you have an idea or dream that will make the world a better place?",
  },
  {
    image: "/img/want-to-be-a-winner.png",
    title: "Want to be a winner?",
    description: "GoodTribes foundations overall goal is to make you and everybody else in the world a winner.",
  },
];

function ProjectCard({ project }: {
  project: {
    slug: string;
    title: string;
    description: string | null;
    status: string;
    imageUrl: string | null;
    owner: { name: string | null };
    members: { id: string }[];
    _count: { kanbanCards: number; todoItems: number };
  };
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
    >
      <div className="relative aspect-[4/3] w-full">
        {project.imageUrl ? (
          <Image src={project.imageUrl} alt={project.title} fill className="object-cover"
            sizes="(max-width: 640px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dry-sage to-muted-teal/40 flex items-center justify-center p-4">
            <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">{project.title}</p>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate capitalize">
          {project.status}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{project.title}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          by <span className="text-coral">{project.owner.name ?? "Unknown"}</span>
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
          {project.description ?? "No description yet."}
        </p>
        <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.members.length}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">
              {project._count.kanbanCards + project._count.todoItems}
            </p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Tasks</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate capitalize">{project.status}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Stage</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [recentProjects, activeProjects] = await Promise.all([
    prisma.project.findMany({
      where: { visibility: "public" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
    prisma.project.findMany({
      where: { visibility: "public" },
      orderBy: { members: { _count: "desc" } },
      take: 4,
      include: {
        owner: { select: { name: true } },
        members: { select: { id: true } },
        _count: { select: { kanbanCards: true, todoItems: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-12">

      {/* What is GoodTribes? */}
      <section className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-56 md:min-h-0 rounded-tl-lg rounded-bl-lg overflow-hidden">
            <Image
              src="/img/what-is-goodtribes.png"
              alt="GoodTribes community illustration"
              fill className="object-cover"
              style={{ top: "-1px" }}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="p-8 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-coral mb-4">What is GoodTribes?</h2>
            <p className="text-sm text-dark-slate/70 mb-3">
              GoodTribes is a nonprofit foundation that gives people the tools they need to make the world a better place.
            </p>
            <p className="text-sm text-dark-slate/70 mb-3">
              We help people make their ideas and dreams about a better world come true. Every big change starts with a small step — at GoodTribes, no effort is too small and no dream is too big.
            </p>
            <p className="text-sm text-dark-slate/70 mb-4">
              The world changes when we work together to make good ideas come true.
            </p>
            <div className="flex gap-3">
              <Link href="/projects" className="text-sm font-medium bg-coral text-white px-4 py-2 rounded hover:bg-watermelon transition-colors">
                Browse projects
              </Link>
              <Link href="/ideas" className="text-sm font-medium border border-coral text-coral px-4 py-2 rounded hover:bg-coral/5 transition-colors">
                Share an idea
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        {FEATURE_CARDS.map((card) => (
          <div key={card.title}>
            <div className="relative aspect-[4/3] w-full rounded-t-lg overflow-hidden mb-4">
              <Image
                src={card.image} alt={card.title} fill className="object-cover"
                style={{ top: "-1px", objectPosition: card.objectPosition ?? "center center" }}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="px-3">
              <h3 className="font-bold text-coral mb-2">{card.title}</h3>
              <p className="text-sm text-dark-slate/70 mb-2">{card.description}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Active projects */}
      {activeProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">Active projects</h2>
            <Link href="/projects" className="text-xs text-coral hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeProjects.map((p) => <ProjectCard key={p.slug} project={p} />)}
          </div>
        </section>
      )}

      {/* New projects — only those not already shown above */}
      {(() => {
        const shownSlugs = new Set(activeProjects.map((p) => p.slug));
        const fresh = recentProjects.filter((p) => !shownSlugs.has(p.slug));
        return fresh.length > 0 ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide">New projects</h2>
              <Link href="/projects/new" className="text-xs text-coral hover:underline">Start a project →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {fresh.map((p) => <ProjectCard key={p.slug} project={p} />)}
            </div>
          </section>
        ) : null;
      })()}

      {activeProjects.length === 0 && recentProjects.length === 0 && (
        <div className="text-center py-16">
          <p className="text-dark-slate/40 mb-4">No projects yet — be the first!</p>
          <Link href="/projects/new" className="bg-coral text-white px-6 py-3 rounded font-medium hover:bg-watermelon transition-colors">
            Create a project
          </Link>
        </div>
      )}

    </div>
  );
}
