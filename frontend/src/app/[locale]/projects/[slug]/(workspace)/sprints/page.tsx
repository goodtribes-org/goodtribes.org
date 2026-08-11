import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { hasProjectRole, PROJECT_LEAD_ROLES, isSiteAdmin } from "@/lib/authz";
import { listSprintsForProject } from "@/lib/sprints";
import { Link } from "@/i18n/navigation";
import NewSprintForm from "./NewSprintForm";
import DeleteSprintButton from "./DeleteSprintButton";
import type { Locale } from "next-intl";

export default async function SprintsPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const [session, project, t] = await Promise.all([
    auth(),
    prisma.project.findUnique({ where: { slug }, select: { id: true, title: true } }),
    getTranslations({ locale, namespace: "SprintsPage" }),
  ]);
  if (!project) notFound();

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: t("statusActive"),
    PAUSED: t("statusPaused"),
    COMPLETED: t("statusCompleted"),
  };

  const PHASE_LABEL: Record<string, string> = {
    UNDERSTAND: t("phaseUnderstand"),
    DIVERGE: t("phaseDiverge"),
    DECIDE: t("phaseDecide"),
    PROTOTYPE: t("phasePrototype"),
    VALIDATE: t("phaseValidate"),
  };

  const [isLead, isAdmin] = session?.user?.id
    ? await Promise.all([
        hasProjectRole(project.id, session.user.id, PROJECT_LEAD_ROLES),
        isSiteAdmin(session.user.id),
      ])
    : [false, false];
  const canDelete = isLead || isAdmin;
  const sprints = await listSprintsForProject(slug);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-dark-slate mb-1">{t("heading")}</h1>
      <p className="text-sm text-dark-slate/60 mb-6">{t("intro")}</p>

      <div className="border border-muted-teal/30 rounded-xl divide-y divide-muted-teal/15 mb-8">
        {sprints.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-seagrass/5 transition-colors">
            <Link href={`/projects/${slug}/sprints/${s.id}`} className="flex items-center justify-between gap-3 flex-1 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-dark-slate truncate">{s.name}</p>
                <p className="text-xs text-dark-slate/40">
                  {PHASE_LABEL[s.currentPhase]} · {s.pace === "TOGETHER" ? t("paceTogether") : t("paceSpreadOut")}
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
            </Link>
            {canDelete && <DeleteSprintButton projectSlug={slug} sprintId={s.id} sprintName={s.name} />}
          </div>
        ))}
        {sprints.length === 0 && (
          <p className="text-sm text-dark-slate/40 italic p-4">{t("emptyState")}</p>
        )}
      </div>

      {isLead && <NewSprintForm projectSlug={slug} />}
    </div>
  );
}
