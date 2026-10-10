import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { hasProjectRole, isSiteAdmin, PROJECT_LEAD_ROLES } from "@/lib/authz";
import { diffForReview, isRichField, parseRevisionField } from "@/lib/projectRevisions";
import { revisionFieldLabels } from "@/lib/projectRevisionLabels";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import WorkspacePageHeader from "@/components/WorkspacePageHeader";
import { Link } from "@/i18n/navigation";
import RevisionDecision from "./RevisionDecision";

export const dynamic = "force-dynamic";

const RECENT_DECIDED = 20;

// Föreslå en ändring (#290): the leads review proposed changes here — a
// word diff against the text as it was when the proposal was written, and a
// warning if it has changed since. Anyone else sees only their own.
export default async function ChangesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) notFound();
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, summary: true, description: true, leanCanvas: true } });
  if (!project) notFound();

  const isLead = (await hasProjectRole(project.id, userId, PROJECT_LEAD_ROLES)) || (await isSiteAdmin(userId));
  const mine = isLead ? {} : { authorId: userId };
  const [pending, decided, t, label] = await Promise.all([
    prisma.projectRevision.findMany({
      where: { projectId: project.id, status: "PENDING", ...mine },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.projectRevision.findMany({
      where: { projectId: project.id, status: { not: "PENDING" }, ...mine },
      orderBy: { decidedAt: "desc" },
      take: RECENT_DECIDED,
      include: { author: { select: { id: true, name: true } }, decidedBy: { select: { name: true } } },
    }),
    getTranslations({ locale, namespace: "ProjectRevisions" }),
    revisionFieldLabels(locale),
  ]);

  const current = (field: string): string | null => {
    const target = parseRevisionField(field);
    if (!target) return null;
    if (target.entity === "project") return project[target.key];
    return (project.leanCanvas?.[target.key] as string | null | undefined) ?? null;
  };
  const date = (d: Date) => d.toLocaleDateString(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });

  return (
    <div className="max-w-3xl">
      <WorkspacePageHeader title={t("pageHeading")} description={isLead ? t("pageBodyLead") : t("pageBodyMine")} />

      {pending.length === 0 && decided.length === 0 && <p className="text-sm text-dark-slate/60">{t("empty")}</p>}

      {pending.length > 0 && (
        <ul className="space-y-5">
          {pending.map((r) => {
            const target = parseRevisionField(r.field);
            if (!target) return null;
            const changedSince = (current(r.field) ?? "") !== (r.baseValue ?? "");
            const diff = diffForReview(target, r.baseValue, r.proposedValue);
            return (
              <li key={r.id} className="rounded-xl border border-muted-teal/30 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-dark-slate">{label(r.field)}</p>
                  <p className="text-xs text-dark-slate/60">
                    {t("proposedBy", { date: date(r.createdAt) })}{" "}
                    <Link href={`/members/${r.author.id}`} className="font-medium text-dark-slate hover:underline">{r.author.name ?? t("someone")}</Link>
                  </p>
                </div>
                {r.reason && <p className="mt-2 rounded-lg bg-dry-sage/40 px-3 py-2 text-sm text-dark-slate">&ldquo;{r.reason}&rdquo;</p>}
                {changedSince && <p className="mt-2 text-xs font-medium text-amber-700">{t("changedSince")}</p>}
                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-muted-teal/20 bg-gray-50 p-3 text-sm leading-relaxed text-dark-slate">
                  {diff.map((part, i) =>
                    part.type === "same" ? <span key={i}>{part.text}</span>
                      : part.type === "add" ? <ins key={i} className="bg-green-100 text-green-900 no-underline">{part.text}</ins>
                        : <del key={i} className="bg-red-100 text-red-900">{part.text}</del>,
                  )}
                </p>
                {isRichField(target) && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs text-dark-slate/60">{t("showFormatted")}</summary>
                    <div className="prose mt-2 max-w-none text-dark-slate" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.proposedValue) }} />
                  </details>
                )}
                {isLead ? <RevisionDecision revisionId={r.id} /> : <p className="mt-3 text-xs text-dark-slate/50">{t("waiting")}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dark-slate/50">{t("decidedHeading")}</h2>
          <ul className="divide-y divide-muted-teal/20 rounded-xl border border-muted-teal/30 bg-white">
            {decided.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <span className={`mr-2 font-semibold ${r.status === "ACCEPTED" ? "text-seagrass" : "text-dark-slate/50"}`}>
                  {r.status === "ACCEPTED" ? t("accepted") : t("declined")}
                </span>
                <span className="text-dark-slate">{label(r.field)}</span>
                <span className="text-dark-slate/50"> · {r.author.name ?? t("someone")}{r.decidedAt && ` · ${date(r.decidedAt)}`}</span>
                {r.decisionNote && <p className="mt-1 text-xs text-dark-slate/70">{r.decidedBy?.name ? `${r.decidedBy.name}: ` : ""}{r.decisionNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
