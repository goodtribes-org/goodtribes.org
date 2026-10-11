import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "next-intl";
import { prisma } from "@/lib/prisma";
import { hasVoice } from "@/lib/impactStory";
import { confirmationState, hashConfirmationToken, isWellFormedToken } from "@/lib/impactConfirmation";
import ConfirmForm from "./ConfirmForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

// Partnerbekräftelse (#336): what the recipient of a team's link sees —
// the project's story, figures as reported (never summed) and a voice
// shared with consent, nothing else — and one button to confirm it. No
// account. A link that's used, taken back or too old says so, and shows
// nothing of the project.
export default async function ConfirmImpactPage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "ImpactConfirm" });
  const row = isWellFormedToken(token)
    ? await prisma.impactConfirmation.findUnique({
        where: { tokenHash: hashConfirmationToken(token) },
        select: { label: true, confirmedAt: true, revokedAt: true, expiresAt: true, project: { select: { id: true, slug: true, title: true, hiddenAt: true } } },
      })
    : null;
  const state = row && !row.project.hiddenAt ? confirmationState(row, Date.now()) : null;

  if (!row || state !== "waiting") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-dark-slate">{state === "confirmed" ? t("alreadyHeading") : t("goneHeading")}</h1>
        <p className="text-sm text-dark-slate/70">{state === "confirmed" ? t("alreadyText") : t("goneText")}</p>
      </main>
    );
  }

  const { project } = row;
  const [followup, metrics, reports] = await Promise.all([
    prisma.impactFollowup.findUnique({ where: { projectSlug: project.slug }, select: { story: true, voiceQuote: true, voiceWho: true, voiceConsent: true } }),
    prisma.impactMetric.findMany({ where: { projectSlug: project.slug, updates: { some: {} } }, orderBy: { createdAt: "asc" }, select: { id: true, label: true, unit: true, currentValue: true } }),
    prisma.impactReport.findMany({
      where: { projectId: project.id, kind: "DELIVERED", rejectedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, metricDescription: true, metricValue: true, metricUnit: true, valueQualifier: true, isCumulative: true },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-seagrass">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-dark-slate">{project.title}</h1>
        <p className="mt-2 text-sm text-dark-slate/70">{t("intro")}</p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-muted-teal/30 bg-white p-5">
        <h2 className="text-base font-semibold text-dark-slate">{t("storyHeading")}</h2>
        <p className="whitespace-pre-line text-sm text-dark-slate/85">{followup?.story}</p>
        {(metrics.length > 0 || reports.length > 0) && (
          <>
            <h3 className="border-t border-muted-teal/20 pt-4 text-sm font-semibold text-dark-slate">{t("numbersHeading")}</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-dark-slate/80">
              {metrics.map((m) => (
                <li key={m.id}>{m.label}: <span className="font-semibold">{fmt(m.currentValue)} {m.unit}</span></li>
              ))}
              {reports.map((r) => (
                <li key={r.id}>
                  {r.metricDescription}:{" "}
                  <span className="font-semibold">
                    {r.valueQualifier === "AT_LEAST" ? `${t("atLeast")} ` : r.valueQualifier === "APPROXIMATE" ? `${t("approx")} ` : ""}
                    {fmt(r.metricValue)} {r.metricUnit ?? ""}
                  </span>
                  {r.isCumulative && <span className="text-dark-slate/50"> ({t("cumulative")})</span>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-dark-slate/50">{t("neverSummed")}</p>
          </>
        )}
        {hasVoice(followup) && (
          <blockquote className="border-l-4 border-seagrass/50 pl-4 text-sm italic text-dark-slate/85">
            ”{followup!.voiceQuote}”{followup!.voiceWho && <span className="mt-1 block not-italic text-dark-slate/60">— {followup!.voiceWho}</span>}
          </blockquote>
        )}
      </section>

      <ConfirmForm token={token} />
    </main>
  );
}
