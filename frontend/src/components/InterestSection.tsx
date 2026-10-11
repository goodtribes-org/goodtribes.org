import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { asksForInterest, groupByPlace } from "@/lib/interest";
import InterestButton from "@/app/[locale]/projects/[slug]/InterestButton";

// On the public project page (#332): where people want the project to
// start, as places and counts only — never names or contacts — and the
// button to add yours. Shown only when the project asks for interest.
export async function InterestSection({ projectId, slug, locale }: { projectId: string; slug: string; locale: string }) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { publishedAt: true, openForReplication: true, phase: true } });
  if (!project || !asksForInterest(project)) return null;
  const [rows, t] = await Promise.all([
    prisma.interestSignal.findMany({ where: { projectId }, select: { place: true, wantsToHelp: true } }),
    getTranslations({ locale, namespace: "InterestSection" }),
  ]);
  const places = groupByPlace(rows);
  return (
    <section aria-labelledby="interest-heading" className="rounded-2xl border border-muted-teal/30 bg-white p-5">
      <h2 id="interest-heading" className="mb-1 text-base font-semibold text-dark-slate">{t("heading")}</h2>
      <p className="mb-3 text-sm text-dark-slate/70">
        {rows.length ? t("summary", { people: rows.length, places: places.length }) : t("empty")}
      </p>
      {places.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5 text-xs">
          {places.slice(0, 12).map((p) => (
            <li key={p.place} className="rounded-full bg-dry-sage/30 px-2.5 py-1 text-dark-slate/80">
              {p.place} · {p.count}
            </li>
          ))}
        </ul>
      )}
      <InterestButton slug={slug} />
    </section>
  );
}
