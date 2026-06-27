import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProjectTabNav from "./ProjectTabNav";

const STAGES = ["Concept", "Prototype", "Production", "Delivery"];
const STATUS_TO_STAGE: Record<string, number> = {
  concept: 0, prototype: 1, production: 2, delivery: 3,
};
const SDG_INFO: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",              color: "#E5243B" },
  2:  { label: "Zero Hunger",             color: "#DDA63A" },
  3:  { label: "Good Health",             color: "#4C9F38" },
  4:  { label: "Quality Education",       color: "#C5192D" },
  5:  { label: "Gender Equality",         color: "#FF3A21" },
  6:  { label: "Clean Water",             color: "#26BDE2" },
  7:  { label: "Clean Energy",            color: "#FCC30B" },
  8:  { label: "Decent Work",             color: "#A21942" },
  9:  { label: "Industry & Innovation",   color: "#FD6925" },
  10: { label: "Reduced Inequalities",    color: "#DD1367" },
  11: { label: "Sustainable Cities",      color: "#FD9D24" },
  12: { label: "Responsible Consumption", color: "#BF8B2E" },
  13: { label: "Climate Action",          color: "#3F7E44" },
  14: { label: "Life Below Water",        color: "#0A97D9" },
  15: { label: "Life on Land",            color: "#56C02B" },
  16: { label: "Peace & Justice",         color: "#00689D" },
  17: { label: "Partnerships",            color: "#19486A" },
};

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({
      where: { slug },
      select: {
        imageUrl: true,
        title: true,
        status: true,
        category: true,
        tags: true,
        sdgGoals: true,
        org: { select: { name: true, slug: true } },
        owner: { select: { name: true } },
        _count: { select: { members: true } },
      },
    }),
  ]);
  if (!project) notFound();

  const stageIndex = STATUS_TO_STAGE[project.status] ?? 0;
  const isOwner = session?.user?.id
    ? !!(await prisma.projectMember.findFirst({
        where: { project: { slug }, userId: session.user.id, role: { in: ["owner", "admin"] } },
      }))
    : false;

  return (
    <>
      {/* Full-bleed hero — flush with header */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="relative w-full h-80 md:h-[520px]">
          {project.imageUrl ? (
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dark-slate to-dark-slate/70 flex items-center justify-center">
              <p className="text-3xl font-bold text-white text-center px-8 leading-snug">{project.title}</p>
            </div>
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-80 bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h1 className="text-lg font-bold text-dark-slate leading-tight mb-0.5">{project.title}</h1>
              <p className="text-xs text-dark-slate/60">
                by <span className="text-coral">{project.owner.name ?? "Unknown"}</span>
                {project.org && (
                  <> · <Link href={`/org/${project.org.slug}`} className="hover:text-seagrass transition-colors">{project.org.name}</Link></>
                )}
              </p>
            </div>
            {isOwner && (
              <Link
                href={`/projects/${slug}/edit`}
                className="shrink-0 px-2.5 py-1 rounded border border-muted-teal/60 text-xs font-medium text-dark-slate/70 hover:text-dark-slate transition-colors"
              >
                Edit
              </Link>
            )}
          </div>

          {(project.category || (project.tags ?? []).length > 0) && (
            <div className="flex flex-wrap gap-1 mb-2">
              {project.category && (
                <span className="text-xs bg-muted-teal/30 text-dark-slate px-2 py-0.5 rounded font-medium">{project.category}</span>
              )}
              {(project.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs border border-muted-teal/60 text-dark-slate/60 px-2 py-0.5 rounded">#{tag}</span>
              ))}
            </div>
          )}

          {project.sdgGoals.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {project.sdgGoals.map((n) => {
                const info = SDG_INFO[n];
                return (
                  <span key={n} title={`SDG ${n}: ${info?.label ?? ""}`} className="text-xs font-bold px-2 py-0.5 rounded text-white cursor-default" style={{ backgroundColor: info?.color ?? "#888" }}>
                    {n}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-dark-slate/60">
            <span className="capitalize font-medium text-dark-slate">{STAGES[stageIndex]}</span>
            <span>·</span>
            <span>{project._count.members} member{project._count.members !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="pt-6">
        <ProjectTabNav slug={slug} />
      </div>

      {children}
    </>
  );
}
