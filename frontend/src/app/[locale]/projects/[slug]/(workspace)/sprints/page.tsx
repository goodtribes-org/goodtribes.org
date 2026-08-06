import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasProjectRole, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { listSprintsForProject } from "@/lib/sprints";
import NewSprintForm from "./NewSprintForm";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Pågår",
  PAUSED: "Pausad",
  COMPLETED: "Avslutad",
};

const PHASE_LABEL: Record<string, string> = {
  UNDERSTAND: "Förstå",
  DIVERGE: "Skissa",
  DECIDE: "Besluta",
  PROTOTYPE: "Prototypa",
  VALIDATE: "Testa",
};

export default async function SprintsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [session, project] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true } }),
  ]);
  if (!project) notFound();

  const isLead = session?.user?.id ? await hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES) : false;
  const sprints = await listSprintsForProject(slug);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-dark-slate mb-1">Design Sprints</h1>
      <p className="text-sm text-dark-slate/60 mb-6">
        Ett asynkront, steg-för-steg-arbetssätt för att undersöka, skissa och testa idéer tillsammans —
        utan att alla behöver vara online samtidigt.
      </p>

      <div className="border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15 mb-8">
        {sprints.map((s) => (
          <a
            key={s.id}
            href={`/projects/${slug}/sprints/${s.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-seagrass/5 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-dark-slate truncate">{s.name}</p>
              <p className="text-xs text-dark-slate/40">
                {PHASE_LABEL[s.currentPhase]} · {s.pace === "TOGETHER" ? "Gemensamt" : "Utspritt över tid"}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                s.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700"
                  : s.status === "PAUSED"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-dry-sage text-dark-slate/60"
              }`}
            >
              {STATUS_LABEL[s.status]}
            </span>
          </a>
        ))}
        {sprints.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">Inga sprintar ännu.</p>
        )}
      </div>

      {isLead && <NewSprintForm projectSlug={slug} />}
    </div>
  );
}
