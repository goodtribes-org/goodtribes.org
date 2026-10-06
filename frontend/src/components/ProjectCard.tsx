import { useTranslations } from "next-intl";
import { SdgIcon } from "@/components/SdgIcon";
import { sdgIconPath, SDG_COLORS } from "@/lib/sdg";
import { isCommercialLegalType } from "@/lib/legalType";
import { toProxyUrl } from "@/lib/storageUrl";
import { htmlToText } from "@/lib/htmlToText";

// A description can be stored as HTML (a project created through the guide
// gets "<h3>Problemet</h3><p>…</p>"). The card has room for a few lines of
// running text, so headings are dropped and the rest flattened to one line;
// React escapes the result, so no markup ever renders from it.
function cardText(text: string | null): string | null {
  if (!text) return null;
  const flat = htmlToText(text.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi, "")).replace(/\n/g, " ");
  return flat || null;
}

export type ProjectCardData = {
  slug: string;
  title: string;
  slogan?: string | null;
  summary: string | null;
  description: string | null;
  phase: string;
  archivedAt: Date | string | null;
  isSandbox?: boolean;
  imageUrl: string | null;
  sdgGoals: number[];
  legalType: string;
  likes: number;
  owner: { name: string | null };
  members: { id: string }[];
  taskProgress: { total: number; done: number };
  // What the project itself picked under "Kompetenser som behövs" on its edit
  // page. Non-empty means it is asking for help, and the card says so.
  neededSkills?: { skill: { name: string } }[];
  // The people in the project, whoever started it first. When given, the card
  // shows them as small faces under the title instead of "av: namn".
  people?: { id: string; name: string | null; image: string | null }[];
};

const MAX_FACES = 6;

function Face({ person, title, starter }: { person: { name: string | null; image: string | null }; title: string; starter: boolean }) {
  // Whoever started the project gets a green ring.
  const ring = starter ? "0 0 0 2px #FFFFFF, 0 0 0 4px #097809" : "0 0 0 2px #FFFFFF";
  const initials = (person.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return person.image ? (
    <img src={toProxyUrl(person.image)} alt={title} title={title} className="h-6 w-6 shrink-0 rounded-full object-cover" style={{ boxShadow: ring }} />
  ) : (
    <span title={title} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DCEAE0] text-[9px] font-bold text-[#24533A]" style={{ boxShadow: ring }}>
      {initials}
    </span>
  );
}

export default function ProjectCard({
  project,
  variant,
  showStats = true,
}: {
  project: ProjectCardData;
  variant?: "default" | "sandbox";
  showStats?: boolean;
}) {
  const t = useTranslations("ProjectCard");

  // Card-only stage bucket — the real ProjectPhase enum has 7 lifecycle
  // phases (see @/lib/projectPhase), simplified here to the buckets the
  // design calls for. Archival is decoupled from phase, so it's checked
  // separately.
  const PHASE_LABEL: Record<string, string> = {
    IDEA: t("phaseIdea"),
    SPRINT: t("phaseIdea"),
    PILOT: t("phaseActive"),
    PRODUCTION: t("phaseActive"),
    ESTABLISH: t("phaseActive"),
    SCALE: t("phaseActive"),
    IMPACT: t("phaseImpact"),
  };

  // Falls back to the project's own isSandbox flag when the caller doesn't
  // pin a variant explicitly — listing pages that mix real and sandbox
  // projects together (homepage, /projects) rely on this so real projects
  // stand out with a green border instead of all looking the same.
  const effectiveVariant = variant ?? (project.isSandbox ? "sandbox" : "default");
  const primarySdg = project.sdgGoals[0];
  const tint = effectiveVariant === "sandbox" ? "#f59e0b" : primarySdg ? SDG_COLORS[primarySdg] : "#43aa8b";
  const stageLabel = project.archivedAt ? t("phaseArchived") : PHASE_LABEL[project.phase] ?? project.phase;
  const seekingSkills = project.neededSkills?.map((s) => s.skill.name) ?? [];

  return (
    <a
      href={`/projects/${project.slug}`}
      className={`w-full rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col ${
        effectiveVariant === "sandbox" ? "border border-orange-500 hover:border-orange-600" : "border border-seagrass hover:border-dark-slate"
      }`}
    >
      <div className="relative aspect-[4/3] w-full">
        {project.imageUrl ? (
          <img
            src={project.imageUrl}
            alt={project.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in oklab, ${tint} 18%, white)` }}
          >
            {primarySdg && (
              <img src={sdgIconPath(primarySdg)} alt="" width={72} height={72} className="rounded shadow-sm" />
            )}
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate flex items-center gap-1 border border-muted-teal/40">
          <span className="text-coral">♥</span> {project.likes}
        </span>
        <span
          title={isCommercialLegalType(project.legalType) ? t("commercialProject") : t("nonCommercialProject")}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 border border-muted-teal/40 flex items-center justify-center"
        >
          {isCommercialLegalType(project.legalType) ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0505cb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <rect x="2" y="7" width="20" height="13" rx="2"></rect>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#097809" className="w-3.5 h-3.5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
            </svg>
          )}
        </span>
        {seekingSkills.length > 0 && (
          <span
            title={t("seekingHelpTitle", { skills: seekingSkills.join(", ") })}
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-coral px-2 py-1 text-[11px] font-bold text-white shadow-sm"
          >
            {/* raised hand */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M18 11V6a2 2 0 0 0-4 0v5" />
              <path d="M14 10V4a2 2 0 0 0-4 0v6" />
              <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
            {t("seekingHelp")}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        {project.people ? (
          <>
            <p className="font-bold text-dark-slate text-sm leading-tight mb-2">{project.title}</p>
            <div className="mb-2 flex items-center gap-1.5 pl-1">
              {project.people.slice(0, MAX_FACES).map((person, i) => (
                <Face
                  key={person.id}
                  person={person}
                  starter={i === 0}
                  title={i === 0 ? t("startedProject", { name: person.name ?? t("unknownAuthor") }) : (person.name ?? "")}
                />
              ))}
              {project.people.length > MAX_FACES && (
                <span className="ml-0.5 text-[11px] font-semibold text-dark-slate/50">+{project.people.length - MAX_FACES}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{project.title}</p>
            <p className="text-xs text-dark-slate/50 mb-2">
              {t("byAuthor")} <span className="text-coral">{project.owner.name ?? t("unknownAuthor")}</span>
            </p>
          </>
        )}
        <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
          {cardText(project.summary) ?? cardText(project.description) ?? t("noDescriptionYet")}
        </p>
        {project.sdgGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] font-bold text-dark-slate/40 mr-0.5">{t("agenda2030")}</span>
            {project.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        {showStats && (
          <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
            <div className="px-1">
              <p className="text-xs font-semibold text-dark-slate">{project.members.length}</p>
              <p className="text-[10px] text-dark-slate/50 leading-tight">{t("members")}</p>
            </div>
            <div className="px-1">
              <p className="text-xs font-semibold text-dark-slate">
                {project.taskProgress.done}/{project.taskProgress.total}
              </p>
              <p className="text-[10px] text-dark-slate/50 leading-tight">{t("tasks")}</p>
            </div>
            <div className="px-1">
              <p className="text-xs font-semibold text-dark-slate">{stageLabel}</p>
              <p className="text-[10px] text-dark-slate/50 leading-tight">{t("stage")}</p>
            </div>
          </div>
        )}
      </div>
    </a>
  );
}
