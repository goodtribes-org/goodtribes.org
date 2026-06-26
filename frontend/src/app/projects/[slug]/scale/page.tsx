import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import ReplicationToggle from "./ReplicationToggle";
import StartInstanceForm from "./StartInstanceForm";

const prisma = new PrismaClient();

export default async function ScalePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      members: { select: { userId: true, role: true } },
      parentInstances: {
        include: {
          child: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!project) notFound();

  const maturity = await prisma.projectMaturity.findUnique({ where: { projectSlug: slug } });

  if (!maturity || maturity.score < 70) {
    redirect(`/projects/${slug}`);
  }

  const userId = session?.user?.id;
  const userMembership = project.members.find((m) => m.userId === userId);
  const isOwnerOrAdmin = !!userMembership && ["owner", "admin"].includes(userMembership.role);

  // Check if user already has a pending/active instance from this parent
  const existingInstance = userId
    ? await prisma.projectInstance.findFirst({
        where: { parentSlug: slug, child: { ownerId: userId } },
      })
    : null;

  // Render markdown-like content by splitting on double newlines for paragraphs
  function renderScalingPlan(text: string) {
    return text.split(/\n\n+/).map((block, i) => {
      const trimmed = block.trim();
      if (trimmed.startsWith("# ")) {
        return <h1 key={i} className="text-xl font-bold text-dark-slate mt-4 mb-2">{trimmed.slice(2)}</h1>;
      }
      if (trimmed.startsWith("## ")) {
        return <h2 key={i} className="text-lg font-semibold text-dark-slate mt-4 mb-2">{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith("### ")) {
        return <h3 key={i} className="text-base font-semibold text-dark-slate mt-3 mb-1">{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n").filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "));
        return (
          <ul key={i} className="list-disc list-inside space-y-1 mb-2">
            {items.map((item, j) => (
              <li key={j} className="text-sm text-dark-slate/80">{item.replace(/^[-*]\s+/, "")}</li>
            ))}
          </ul>
        );
      }
      return <p key={i} className="text-sm text-dark-slate/80 leading-relaxed mb-2">{trimmed}</p>;
    });
  }

  return (
    <div className="max-w-3xl">
      <nav className="mb-6 text-sm text-dark-slate/50">
        <Link href="/projects" className="hover:text-dark-slate transition-colors">Projects</Link>
        <span className="mx-2">/</span>
        <Link href={`/projects/${slug}`} className="hover:text-dark-slate transition-colors">{project.title}</Link>
        <span className="mx-2">/</span>
        <span className="text-dark-slate">Skalning</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-dark-slate">Skalningsplan</h1>
        <span className="text-xs font-semibold text-white bg-green-500 px-2 py-0.5 rounded-full">
          Mognad {maturity.score}/100
        </span>
      </div>

      {maturity.scalingPlan ? (
        <div className="border border-muted-teal/30 rounded p-6 mb-8 prose-like">
          {renderScalingPlan(maturity.scalingPlan)}
        </div>
      ) : (
        <div className="border border-muted-teal/30 rounded p-6 mb-8 text-sm text-dark-slate/50 italic">
          Ingen skalningsplan genererad. Gå tillbaka till projektsidan och klicka "Beräkna" for att generera en.
        </div>
      )}

      {isOwnerOrAdmin && (
        <div className="border border-muted-teal/30 rounded p-4 mb-8">
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Replikeringsinställningar</h2>
          <ReplicationToggle projectId={project.id} openForReplication={project.openForReplication} />
        </div>
      )}

      {project.parentInstances.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Aktiva instanser ({project.parentInstances.length})</h2>
          <div className="space-y-2">
            {project.parentInstances.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between p-3 border border-muted-teal/30 rounded">
                <div>
                  <Link href={`/projects/${inst.child.slug}`} className="text-sm font-medium text-seagrass hover:underline">
                    {inst.child.title}
                  </Link>
                  <span className="ml-2 text-xs text-dark-slate/50">{inst.region}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  inst.status === "approved" ? "bg-green-100 text-green-700" :
                  inst.status === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {inst.status === "approved" ? "Godkänd" :
                   inst.status === "rejected" ? "Avvisad" : "Väntar"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {userId && project.openForReplication && !existingInstance && !isOwnerOrAdmin && (
        <div className="border border-muted-teal/30 rounded p-4">
          <h2 className="text-sm font-semibold text-dark-slate mb-3">Starta lokal instans</h2>
          <p className="text-xs text-dark-slate/60 mb-4">
            Du kan starta en lokal version av det här projektet i din region. Din ansökan granskas av projektets ägare.
          </p>
          <StartInstanceForm parentSlug={slug} />
        </div>
      )}

      {userId && existingInstance && (
        <div className="border border-muted-teal/30 rounded p-4">
          <p className="text-sm text-dark-slate/60">
            Du har redan en instans med status:{" "}
            <span className="font-medium text-dark-slate">{existingInstance.status}</span>
          </p>
        </div>
      )}

      {!userId && project.openForReplication && (
        <div className="border border-muted-teal/30 rounded p-4">
          <p className="text-sm text-dark-slate/60">
            <Link href="/login" className="text-coral hover:underline">Logga in</Link> for att ansöka om att starta en lokal instans av det här projektet.
          </p>
        </div>
      )}
    </div>
  );
}
