export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasProjectRole, isRealMember, PROJECT_LEAD_ROLES } from "@/lib/authz";
import LeanCanvasBlock from "./LeanCanvasBlock";
import LeanCanvasComments from "./LeanCanvasComments";
import type { LeanCanvasField } from "./fields";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({ where: { slug }, select: { title: true } });
  if (!project) return {};
  return { title: `${project.title} — Lean Canvas — GoodTribes.org` };
}

const BLOCKS: { field: LeanCanvasField; area: string; label: string; hint: string }[] = [
  { field: "problem", area: "problem", label: "Problem", hint: "Topp 3 problem värda att lösa" },
  { field: "alternatives", area: "alt", label: "Alternativ", hint: "Hur löser man problemet idag" },
  { field: "solution", area: "solution", label: "Lösning", hint: "Möjliga lösningar på problemen ovan" },
  { field: "keyMetrics", area: "metrics", label: "Nyckeltal", hint: "Hur ni mäter att det fungerar" },
  { field: "uniqueValueProposition", area: "uvp", label: "Unikt värdeerbjudande", hint: "Ett tydligt budskap som gör er annorlunda" },
  { field: "concept", area: "concept", label: "Koncept", hint: "Vad är pitchen" },
  { field: "unfairAdvantage", area: "unfair", label: "Orättvis fördel", hint: "Något som inte lätt kan kopieras eller köpas" },
  { field: "channels", area: "channels", label: "Kanaler", hint: "Vägar till era kunder" },
  { field: "customerSegments", area: "segments", label: "Kundsegment", hint: "Målgrupper och early adopters" },
  { field: "earlyAdopters", area: "early", label: "Tidiga användare", hint: "Vem kommer först att börja använda lösningen" },
  { field: "costStructure", area: "cost", label: "Kostnadsstruktur", hint: "De viktigaste kostnaderna" },
  { field: "impact", area: "impact", label: "Impact", hint: "Varför, Hur och Vad" },
  { field: "revenueStreams", area: "revenue", label: "Intäktsströmmar", hint: "Hur ni tjänar pengar" },
];

export default async function LeanCanvasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      leanCanvas: { include: { updatedBy: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = session?.user?.id
    ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES)
    : false;
  const canComment = session?.user?.id ? await isRealMember(project.id, session.user.id) : false;
  const canvas = project.leanCanvas;

  const comments = await prisma.leanCanvasComment.findMany({
    where: { projectSlug: slug },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-dark-slate">Lean Canvas</h1>
      </div>

      <style>{`
        .leancanvas-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
        @media (min-width: 900px) {
          .leancanvas-grid {
            grid-template-columns: repeat(10, 1fr);
            grid-template-rows: auto auto auto;
            grid-template-areas:
              "problem problem solution solution uvp uvp unfair unfair segments segments"
              "alt alt metrics metrics concept concept channels channels early early"
              "cost cost cost impact impact impact impact revenue revenue revenue";
          }
          .leancanvas-grid > [data-area="problem"] { grid-area: problem; }
          .leancanvas-grid > [data-area="alt"] { grid-area: alt; }
          .leancanvas-grid > [data-area="solution"] { grid-area: solution; }
          .leancanvas-grid > [data-area="metrics"] { grid-area: metrics; }
          .leancanvas-grid > [data-area="uvp"] { grid-area: uvp; }
          .leancanvas-grid > [data-area="concept"] { grid-area: concept; }
          .leancanvas-grid > [data-area="unfair"] { grid-area: unfair; }
          .leancanvas-grid > [data-area="channels"] { grid-area: channels; }
          .leancanvas-grid > [data-area="segments"] { grid-area: segments; }
          .leancanvas-grid > [data-area="early"] { grid-area: early; }
          .leancanvas-grid > [data-area="cost"] { grid-area: cost; }
          .leancanvas-grid > [data-area="impact"] { grid-area: impact; }
          .leancanvas-grid > [data-area="revenue"] { grid-area: revenue; }
        }
      `}</style>

      <div className="leancanvas-grid">
        {BLOCKS.map((b) => (
          <LeanCanvasBlock
            key={b.field}
            projectSlug={slug}
            field={b.field}
            area={b.area}
            label={b.label}
            hint={b.hint}
            value={canvas ? canvas[b.field] : null}
            canEdit={canEdit}
          />
        ))}
      </div>

      <LeanCanvasComments
        projectSlug={slug}
        comments={comments}
        canComment={canComment}
        currentUserId={session?.user?.id ?? null}
      />
    </div>
  );
}
