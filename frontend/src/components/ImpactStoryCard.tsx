import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { hasVoice, trustLevel } from "@/lib/impactStory";

// The project's story from the Impact phase (#334), on the public project
// page: the team's own words, a participant's voice (only with consent) and
// how far up the trust ladder it is. Renders nothing until there's a story —
// like VerifiedImpactPanel, it can only add, never advertise an absence.
export async function ImpactStoryCard({ projectId, slug, locale }: { projectId: string; slug: string; locale: string }) {
  const [followup, delivered, verified, t] = await Promise.all([
    prisma.impactFollowup.findUnique({
      where: { projectSlug: slug },
      select: { story: true, voiceQuote: true, voiceWho: true, voiceConsent: true, externalVerificationNotes: true },
    }),
    prisma.impactReport.count({ where: { projectId, kind: "DELIVERED", rejectedAt: null } }),
    prisma.impactReport.count({ where: { projectId, kind: "DELIVERED", verifiedAt: { not: null } } }),
    getTranslations({ locale, namespace: "ImpactStoryCard" }),
  ]);
  if (!followup?.story?.trim()) return null;
  const level = trustLevel({ followup, deliveredReports: delivered, verifiedDeliveredReports: verified });
  return (
    <section aria-labelledby="impact-story-heading" className="rounded-2xl border border-seagrass/30 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="impact-story-heading" className="text-lg font-semibold text-dark-slate">{t("heading")}</h2>
        {level > 0 && (
          <span className="rounded-full bg-seagrass/10 px-3 py-1 text-xs font-semibold text-seagrass" title={t("trustTitle")}>
            {"⭐".repeat(level)} {t(`trust${level}`)}
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-sm text-dark-slate/80">{followup.story}</p>
      {hasVoice(followup) && (
        <blockquote className="mt-4 border-l-4 border-seagrass/50 pl-4 text-base italic text-dark-slate/85">
          ”{followup.voiceQuote}”{followup.voiceWho && <span className="mt-1 block text-sm not-italic text-dark-slate/60">— {followup.voiceWho}</span>}
        </blockquote>
      )}
    </section>
  );
}
