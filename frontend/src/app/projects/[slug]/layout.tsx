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
        owner: { select: { name: true, image: true } },
        members: {
          select: { user: { select: { name: true, image: true } } },
          orderBy: { joinedAt: "asc" },
          take: 12,
        },
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
      {/* Full-bleed hero: blurred background + title + two photo cards */}
      <div
        className="relative -mt-8"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        {/* Background — fixed 490 px, clipped */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: "490px" }}>
          {project.imageUrl ? (
            <>
              <Image
                src={project.imageUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
                sizes="100vw"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-dark-slate to-dark-slate/70" />
          )}
        </div>

        {/* Content layer — title above, cards below (may overflow bg) */}
        <div className="relative z-10">
          {/* Project title */}
          <div className="flex justify-center pt-5 pb-3 px-6">
            <h1
              className="text-5xl md:text-6xl font-bold text-center leading-tight"
              style={{
                color: "white",
                textShadow:
                  "-1px -1px 0 #999, 1px -1px 0 #999, -1px 1px 0 #999, 1px 1px 0 #999, 2px 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              {project.title}
            </h1>
          </div>

          {/* Two cards */}
          <div className="flex justify-center px-4 pb-10">
            <div className="flex flex-col md:flex-row gap-5 items-stretch">

              {/* Card 1: project image — 820 × 460 */}
              <div
                className="shrink-0 bg-white overflow-hidden"
                style={{
                  width: "820px",
                  height: "460px",
                  border: "24px solid white",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {project.imageUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={project.imageUrl}
                      alt={project.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dry-sage/20">
                    <span className="text-6xl font-bold text-dark-slate/20">
                      {project.title[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Card 2: team + SDG + join — 420 × 460 */}
              <div
                className="shrink-0 bg-white rounded-2xl p-5 flex flex-col"
                style={{
                  width: "320px",
                  height: "460px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {/* Header: title + edit */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold text-dark-slate leading-tight">
                      {project.title}
                    </h1>
                    <p className="text-xs text-dark-slate/50 mt-0.5">
                      av{" "}
                      <span className="text-dark-slate/70 font-medium">
                        {project.owner.name ?? "Okänd"}
                      </span>
                      {project.org && (
                        <>
                          {" "}·{" "}
                          <Link
                            href={`/org/${project.org.slug}`}
                            className="hover:text-seagrass transition-colors"
                          >
                            {project.org.name}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  {isOwner && (
                    <Link
                      href={`/projects/${slug}/edit`}
                      className="shrink-0 px-2.5 py-1 rounded border border-muted-teal/50 text-xs text-dark-slate/50 hover:text-dark-slate transition-colors"
                    >
                      Redigera
                    </Link>
                  )}
                </div>

                {/* Team member avatars */}
                {project.members.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-dark-slate/40 mb-2 uppercase tracking-wide">
                      Teamet · {project._count.members} {project._count.members === 1 ? "medlem" : "medlemmar"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.members.map((m, i) => {
                        const initials = (m.user.name ?? "?").charAt(0).toUpperCase();
                        return (
                          <div
                            key={i}
                            title={m.user.name ?? ""}
                            className="w-10 h-10 rounded-full overflow-hidden bg-dry-sage ring-2 ring-white relative flex items-center justify-center text-sm font-semibold text-dark-slate shrink-0"
                          >
                            {m.user.image ? (
                              <Image
                                src={m.user.image}
                                alt={m.user.name ?? ""}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              initials
                            )}
                          </div>
                        );
                      })}
                      {project._count.members > 12 && (
                        <div className="w-10 h-10 rounded-full ring-2 ring-white bg-muted-teal/20 flex items-center justify-center text-xs font-semibold text-dark-slate/60">
                          +{project._count.members - 12}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SDG badges */}
                {project.sdgGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.sdgGoals.map((n) => {
                      const info = SDG_INFO[n];
                      return (
                        <span
                          key={n}
                          title={`SDG ${n}: ${info?.label ?? ""}`}
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: info?.color ?? "#888" }}
                        >
                          SDG {n}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Join button */}
                <Link
                  href={`/projects/${slug}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-seagrass text-white rounded-xl font-semibold text-sm hover:bg-seagrass/90 transition-colors self-start"
                >
                  Gå med i projektet →
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tab nav — full-bleed border line */}
      <div
        className="mb-6 border-b border-muted-teal/20"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        <div className="px-6">
          <ProjectTabNav slug={slug} />
        </div>
      </div>

      {children}
    </>
  );
}
