export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth";
import { archiveProject } from "./actions";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  return { title: `Alumni — ${project?.title ?? slug}` };
}

export default async function AlumniPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const [project, alumni, maturity] = await Promise.all([
    prisma.project.findUnique({
      where: { slug },
      select: { title: true, slug: true, status: true },
    }),
    prisma.projectAlumni.findMany({
      where: { projectSlug: slug },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { tokensEarned: "desc" },
    }),
    prisma.projectMaturity.findUnique({ where: { projectSlug: slug } }),
  ]);

  if (!project) notFound();

  const projectRec = project
    ? await prisma.project.findUnique({ where: { slug }, select: { id: true } })
    : null;
  const membership = session?.user?.id && projectRec
    ? await prisma.projectMember.findFirst({
        where: { projectId: projectRec.id, userId: session.user.id, role: { in: ["owner", "admin"] } },
      })
    : null;
  const isOwnerOrAdmin = !!membership;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <nav className="text-sm text-dark-slate/50 mb-2">
            <Link href="/projects" className="hover:text-dark-slate">Projects</Link>
            <span className="mx-2">/</span>
            <Link href={`/projects/${slug}`} className="hover:text-dark-slate">{project.title}</Link>
            <span className="mx-2">/</span>
            <span className="text-dark-slate">Alumni</span>
          </nav>
          <h1 className="text-2xl font-bold text-dark-slate">Alumni</h1>
          <p className="text-sm text-dark-slate/50 mt-1">
            Bidragsgivare som formade detta projekt
          </p>
        </div>

        {isOwnerOrAdmin && project.status === "active" && (
          <ArchiveButton projectSlug={slug} />
        )}
      </div>

      {/* Final report */}
      {maturity?.finalReport && (
        <section className="border border-seagrass/30 rounded-xl p-6 bg-seagrass/5">
          <h2 className="text-sm font-semibold text-dark-slate mb-3 flex items-center gap-2">
            <span>📋</span> AI Slutrapport
          </h2>
          <div className="prose prose-sm max-w-none text-dark-slate/80 whitespace-pre-wrap text-sm leading-relaxed">
            {maturity.finalReport}
          </div>
        </section>
      )}

      {isOwnerOrAdmin && !maturity?.finalReport && project.status === "archived" && (
        <GenerateReportButton projectSlug={slug} />
      )}

      {/* Alumni grid */}
      {alumni.length === 0 ? (
        <div className="border border-dashed border-muted-teal/40 rounded-xl p-12 text-center">
          <p className="text-dark-slate/40 text-sm">
            Inga alumni ännu.{" "}
            {project.status === "active"
              ? "Arkivera projektet för att skapa alumni-badges."
              : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alumni.map((a) => {
            const initials = (a.user.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={a.id}
                className="flex items-center gap-4 border border-muted-teal/40 rounded-xl p-4 bg-white"
              >
                <div className="w-12 h-12 rounded-full bg-dry-sage flex items-center justify-center text-sm font-semibold text-dark-slate overflow-hidden relative flex-shrink-0">
                  {a.user.image ? (
                    <Image src={a.user.image} alt={a.user.name ?? ""} fill className="object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-dark-slate text-sm">{a.user.name ?? "Okänd"}</p>
                  <p className="text-xs text-dark-slate/50 mt-0.5">
                    {a.tokensEarned.toFixed(1)} Tribe Tokens
                  </p>
                  <p className="text-xs text-dark-slate/40">
                    Badge: {new Date(a.badgeIssuedAt).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                <span className="text-2xl" title="Alumni">🎓</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2 border-t border-muted-teal/20">
        <Link href="/hall-of-impact" className="text-sm text-seagrass hover:underline font-medium">
          ← Hall of Impact
        </Link>
      </div>
    </div>
  );
}

function ArchiveButton({ projectSlug }: { projectSlug: string }) {
  async function doArchive() {
    "use server";
    await archiveProject(projectSlug);
  }
  return (
    <form action={doArchive}>
      <button
        type="submit"
        className="px-4 py-2 text-sm rounded border border-dark-slate/30 text-dark-slate/60 hover:border-dark-slate/60 hover:text-dark-slate transition-colors"
      >
        Arkivera projekt
      </button>
    </form>
  );
}

function GenerateReportButton({ projectSlug }: { projectSlug: string }) {
  async function doGenerate() {
    "use server";
    await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/maturity/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectSlug }),
    });
  }
  return (
    <form action={doGenerate}>
      <button
        type="submit"
        className="px-4 py-2 text-sm rounded bg-coral text-white font-medium hover:bg-watermelon transition-colors"
      >
        Generera AI Slutrapport
      </button>
    </form>
  );
}
