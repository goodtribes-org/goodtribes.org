import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { isRealMember } from "@/lib/authz";
import { notFoundUnlessVisible } from "@/lib/projectDraftGate";
import { isAnswer, PULSE_INTERVAL_DAYS, PULSE_PHASES, pulseDue } from "@/lib/impactPulse";
import PulseForm from "./PulseForm";

const DAY = 24 * 60 * 60 * 1000;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

// Impactpuls (#335): "Hur gick det den här månaden?" — the page the
// reminder in Att göra opens. The form first, then what the team has said
// before, month by month. The team's own page: members only.
export default async function ImpactPulsePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  await notFoundUnlessVisible(slug);
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true, title: true, phase: true } });
  if (!project) notFound();
  if (!(await isRealMember(project.id, session.user.id))) redirect(`/projects/${slug}`);

  const [t, metrics, rows] = await Promise.all([
    getTranslations({ locale, namespace: "ImpactPulse" }),
    prisma.impactMetric.findMany({ where: { projectSlug: slug }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true } }),
    prisma.impactPulse.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true, note: true, imageUrl: true, impactUpdateId: true, snoozedUntil: true, createdAt: true,
        user: { select: { name: true } },
        impactUpdate: { select: { value: true, impactMetric: { select: { label: true, unit: true } } } },
      },
    }),
  ]);
  const now = Date.now();
  const started = PULSE_PHASES.includes(project.phase);
  const due = pulseDue(project.phase, rows, now);
  const answers = rows.filter(isAnswer);
  const last = answers[0];
  const nextInDays = last ? Math.max(1, Math.ceil((last.createdAt.getTime() + PULSE_INTERVAL_DAYS * DAY - now) / DAY)) : 0;
  const monthFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { month: "long" });
  const dateFmt = new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pt-4 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-dark-slate">{t("heading", { month: monthFmt.format(new Date(now)) })}</h1>
        <p className="mt-1 text-sm text-dark-slate/70">{t("intro")}</p>
      </div>

      {!started && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t("notYet")}</p>}
      {started && !due && last && (
        <p className="rounded-xl border border-seagrass/30 bg-seagrass/5 px-4 py-3 text-sm text-dark-slate/80">
          ✓ {t("doneThisMonth", { name: last.user.name ?? t("someone"), days: nextInDays })}
        </p>
      )}
      {started && <PulseForm slug={slug} metrics={metrics} canSnooze={due} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-dark-slate">{t("earlier")}</h2>
        {answers.length === 0 ? (
          <p className="text-sm text-dark-slate/50">{t("earlierEmpty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {answers.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-muted-teal/25 bg-white px-4 py-3">
                <p className="text-xs text-dark-slate/50">
                  {dateFmt.format(p.createdAt)} · {p.user.name ?? t("someone")}
                </p>
                {p.note && <p className="text-sm text-dark-slate/85">{p.note}</p>}
                {p.impactUpdate && (
                  <p className="text-sm text-dark-slate/80">
                    📏 {p.impactUpdate.impactMetric.label}: <span className="font-semibold">{fmt(p.impactUpdate.value)} {p.impactUpdate.impactMetric.unit}</span>
                  </p>
                )}
                {p.imageUrl && <img src={p.imageUrl} alt="" className="max-h-64 w-full max-w-sm rounded-lg object-cover" />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href={`/projects/${slug}/impactfasen`} className="text-sm font-semibold text-seagrass hover:underline">
        {t("toImpact")} →
      </Link>
    </div>
  );
}
