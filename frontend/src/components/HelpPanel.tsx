"use client";

// The help panel behind "Hjälp" at the right end of the personal bar. It
// follows the page you're on (lib/helpContext.ts):
// 1. "Om den här sidan" — the page's own help text (the same one its "?"
//    button shows),
// 2. inside a project, the phase the page belongs to (or the project's
//    phase), with the next step for members and a link to the phase guide,
// 3. the general guides, the one about this page first.
// Plus a way to ask us (the private feedback at /suggestions).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { helpContextFor, orderedGuides } from "@/lib/helpContext";
import { phaseForProjectPath } from "@/lib/phaseForPath";
import { PHASE_COLORS, type ProjectPhaseValue } from "@/lib/projectPhase";

type DisplayPhase = Exclude<ProjectPhaseValue, "SPRINT">;
type ProjectHelp = { phase: DisplayPhase; nextStepKey: string | null; nextStepHref: string | null };

const guideHref = (slug: string, phase: DisplayPhase) => `/projects/${slug}/guide${phase === "IDEA" ? "" : `/${phase.toLowerCase()}`}`;

export default function HelpPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("HelpPanel");
  const tAll = useTranslations();
  const tPhase = useTranslations("ProjectPhase");
  const tChecklist = useTranslations("ProjectPhaseChecklist");
  const pathname = usePathname();
  const [tab, setTab] = useState<"guides" | "contact">("guides");
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<ProjectHelp | null>(null);

  const { projectSlug, pageHelp, sectionIntros } = helpContextFor(pathname);
  const tIntro = useTranslations("SectionIntro");
  useEffect(() => {
    setProject(null);
    if (!projectSlug) return;
    fetch(`/api/projects/${projectSlug}/help`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setProject(d))
      .catch(() => {});
  }, [projectSlug]);

  // The page's own phase if it belongs to one (a phase tool or overview),
  // otherwise the phase the project is in.
  const pagePhase = projectSlug ? phaseForProjectPath(pathname, projectSlug) : null;
  const phase = pagePhase ?? project?.phase ?? null;

  const q = query.trim().toLowerCase();
  const matches = (...texts: string[]) => !q || texts.join(" ").toLowerCase().includes(q);
  const pageText = pageHelp ? tAll(`${pageHelp}.helpText` as never) : null;
  const intros = sectionIntros
    .map((k) => ({ key: k, title: tIntro(`${k}.title` as never), body: tIntro(`${k}.body` as never), tip: tIntro(`${k}.tip` as never) }))
    .filter((i) => matches(i.title, i.body, i.tip));
  const showPage = (pageText && matches(t("thisPage"), pageText)) || intros.length > 0;
  const showPhase = projectSlug && phase && matches(tPhase(phase), t(`phases.${phase}`));
  const guides = orderedGuides(pathname, !!projectSlug).filter((g) => matches(t(`guides.${g.key}.title`), t(`guides.${g.key}.text`)));
  const nothing = !showPage && !showPhase && guides.length === 0;

  return (
    <div role="dialog" aria-label={t("label")} className="flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-[#E4E4DF] bg-white shadow-2xl">
      <div className="flex items-center gap-1 border-b border-[#E4E4DF] px-2 py-2">
        {(["guides", "contact"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`rounded-full px-3 py-1.5 text-sm ${tab === k ? "bg-dark-slate font-semibold text-white" : "text-dark-slate/70 hover:bg-[#F6F6F3] hover:text-dark-slate"}`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
        <button type="button" onClick={onClose} aria-label={t("close")} className="ml-auto px-2 text-lg leading-none text-dark-slate/50 hover:text-dark-slate">
          ×
        </button>
      </div>

      {tab === "guides" ? (
        <>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#F6F6F3] p-3">
            {showPage && (
              <section className="rounded-xl border border-[#E4E4DF] bg-white px-4 py-3">
                <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("thisPage")}</h3>
                {pageText && <p className="mt-1.5 mb-0 whitespace-pre-line text-sm leading-snug text-dark-slate/80">{pageText}</p>}
                {intros.map((i) => (
                  <details key={i.key} className="mt-2 border-t border-[#E4E4DF] pt-2 first:border-t-0 first:pt-0">
                    <summary className="cursor-pointer text-sm font-semibold text-dark-slate">{i.title}</summary>
                    <p className="mt-1 mb-0 text-sm leading-snug text-dark-slate/80">{i.body}</p>
                    <p className="mt-1 mb-0 text-sm leading-snug text-dark-slate/70">💡 {tIntro("tipLabel")} {i.tip}</p>
                  </details>
                ))}
              </section>
            )}

            {showPhase && (
              <section className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: PHASE_COLORS[phase] }}>
                <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-dark-slate">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PHASE_COLORS[phase] }} aria-hidden="true" />
                  {pagePhase && project && pagePhase !== project.phase
                    ? t("pagePhase", { phase: tPhase(phase) })
                    : t("projectPhase", { phase: tPhase(phase) })}
                </h3>
                <p className="mt-1.5 mb-0 text-sm leading-snug text-dark-slate/75">{t(`phases.${phase}`)}</p>
                {/* The next step is the project's, in its own phase — said so
                    when this page belongs to another one. */}
                {project && pagePhase && pagePhase !== project.phase && (
                  <p className="mt-2 mb-0 text-xs text-dark-slate/60">{t("projectStillIn", { phase: tPhase(project.phase) })}</p>
                )}
                {project?.nextStepKey && project.nextStepHref && (
                  <Link href={project.nextStepHref} onClick={onClose} className="mt-1.5 block text-sm font-semibold text-dark-slate hover:underline">
                    {t("nextStep", { step: tChecklist(project.nextStepKey) })} →
                  </Link>
                )}
                <Link href={guideHref(projectSlug, phase)} onClick={onClose} className="mt-1.5 block text-sm font-semibold text-[#C2410C] hover:underline">
                  {t("phaseGuide", { phase: tPhase(phase) })} →
                </Link>
              </section>
            )}

            {guides.length > 0 && (
              <>
                {(showPage || showPhase) && <h3 className="mx-1 mt-2 mb-0 text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{t("moreGuides")}</h3>}
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {guides.map((g) => (
                    <li key={g.key}>
                      <Link href={g.href} onClick={onClose} className="group block rounded-xl border border-[#E4E4DF] bg-white px-4 py-3 hover:border-[#C2410C]/40">
                        <span className="block text-sm font-semibold text-[#C2410C] group-hover:underline">{t(`guides.${g.key}.title`)}</span>
                        <span className="mt-1 block text-sm leading-snug text-dark-slate/70">{t(`guides.${g.key}.text`)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {nothing && (
              <p className="m-0 px-2 py-3 text-sm text-dark-slate/70">
                {t("noMatch")}{" "}
                <button type="button" onClick={() => setTab("contact")} className="font-semibold text-[#C2410C] hover:underline">
                  {t("askUs")}
                </button>
              </p>
            )}
          </div>
          <div className="border-t border-[#E4E4DF] px-3 py-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="w-full rounded-lg border border-[#E4E4DF] px-3 py-2 text-sm outline-none focus:border-[#C2410C]/50"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 px-5 py-5 text-sm text-dark-slate/80">
          <p className="m-0 font-semibold text-dark-slate">{t("contact.heading")}</p>
          <p className="m-0 leading-relaxed">{t("contact.text")}</p>
          <Link href="/suggestions" onClick={onClose} className="self-start rounded-full bg-[#C2410C] px-4 py-2 font-semibold text-white hover:bg-[#9A3412]">
            {t("contact.cta")}
          </Link>
        </div>
      )}
    </div>
  );
}
