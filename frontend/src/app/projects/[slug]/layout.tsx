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
        id: true,
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

  const [fundingCampaign, isOwnerRecord] = await Promise.all([
    prisma.fundingCampaign.findUnique({
      where: { projectId: project.id },
      include: { pledges: { select: { amount: true } } },
    }),
    session?.user?.id
      ? prisma.projectMember.findFirst({
          where: { project: { slug }, userId: session.user.id, role: { in: ["owner", "admin"] } },
        })
      : Promise.resolve(null),
  ]);

  const isOwner = !!isOwnerRecord;
  const raised = fundingCampaign?.pledges.reduce((s, p) => s + p.amount, 0) ?? 0;
  const fundingPct = fundingCampaign
    ? Math.min(100, Math.round((raised / fundingCampaign.goal) * 100))
    : 0;
  const daysLeft = fundingCampaign?.deadline
    ? Math.max(0, Math.ceil((new Date(fundingCampaign.deadline).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <>
      {/* Full-bleed hero — flush with header */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="relative w-full h-64 md:h-[500px]">
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
              <p className="text-4xl font-bold text-white text-center px-8 leading-snug">{project.title}</p>
            </div>
          )}
        </div>
      </div>

      {/* Below-hero info bar */}
      <div className="py-5 border-b border-muted-teal/20 mb-2">
        <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
          {/* Left: title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold text-dark-slate leading-tight">{project.title}</h1>
              {isOwner && (
                <Link
                  href={`/projects/${slug}/edit`}
                  className="shrink-0 px-3 py-1 rounded border border-muted-teal/60 text-xs font-medium text-dark-slate/70 hover:text-dark-slate transition-colors"
                >
                  Redigera
                </Link>
              )}
            </div>
            <p className="text-sm text-dark-slate/60 mt-1">
              av <span className="text-coral font-medium">{project.owner.name ?? "Okänd"}</span>
              {project.org && (
                <>
                  {" "}·{" "}
                  <Link href={`/org/${project.org.slug}`} className="hover:text-seagrass transition-colors">
                    {project.org.name}
                  </Link>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-xs font-semibold px-2.5 py-1 bg-seagrass/20 text-seagrass rounded-full">
                {STAGES[stageIndex]}
              </span>
              {project.category && (
                <span className="text-xs bg-muted-teal/30 text-dark-slate px-2.5 py-1 rounded-full font-medium">
                  {project.category}
                </span>
              )}
              {(project.tags ?? []).map((tag) => (
                <span key={tag} className="text-xs border border-muted-teal/60 text-dark-slate/60 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
              {project.sdgGoals.map((n) => {
                const info = SDG_INFO[n];
                return (
                  <span
                    key={n}
                    title={`SDG ${n}: ${info?.label ?? ""}`}
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white cursor-default"
                    style={{ backgroundColor: info?.color ?? "#888" }}
                  >
                    SDG {n}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right: funding progress + CTA */}
          <div className="flex flex-col gap-3 md:w-56 shrink-0">
            {fundingCampaign && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-lg font-bold text-dark-slate">
                    {raised.toLocaleString("sv-SE")} {fundingCampaign.currency}
                  </span>
                  <span className="text-xs text-dark-slate/50">
                    av {fundingCampaign.goal.toLocaleString("sv-SE")}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted-teal/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-coral rounded-full transition-all"
                    style={{ width: `${fundingPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-dark-slate/50">
                  <span className="font-semibold text-dark-slate">{fundingPct}% finansierat</span>
                  {daysLeft !== null && <span>{daysLeft} dagar kvar</span>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-dark-slate/60">
              <span>👥</span>
              <span>
                {project._count.members} {project._count.members === 1 ? "medlem" : "medlemmar"}
              </span>
            </div>
            <Link
              href={`/projects/${slug}`}
              className="w-full text-center px-4 py-2.5 bg-coral text-white rounded-xl font-semibold text-sm hover:bg-coral/90 transition-colors"
            >
              Gå med
            </Link>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="mb-6">
        <ProjectTabNav slug={slug} />
      </div>

      {children}
    </>
  );
}
