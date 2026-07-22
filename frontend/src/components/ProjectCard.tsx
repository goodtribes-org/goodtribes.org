import { SdgIcon } from "@/components/SdgIcon";
import { sdgIconPath, SDG_COLORS } from "@/lib/sdg";
import { isCommercialLegalType } from "@/lib/legalType";

export type ProjectCardData = {
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  phase: string;
  archivedAt: Date | string | null;
  imageUrl: string | null;
  sdgGoals: number[];
  legalType: string;
  likes: number;
  owner: { name: string | null };
  members: { id: string }[];
  _count: { kanbanCards: number };
  kanbanCardsDone: number;
};

// Card-only Swedish stage bucket — the real ProjectPhase enum has 7 lifecycle
// phases (see @/lib/projectPhase), simplified here to the buckets the design
// calls for. Archival is decoupled from phase, so it's checked separately.
const PHASE_LABEL_SV: Record<string, string> = {
  IDEA: "Idéfas",
  PROJECT: "Idéfas",
  PILOT: "Aktivt",
  PRODUCTION: "Aktivt",
  ESTABLISH: "Aktivt",
  SCALE: "Aktivt",
  IMPACT: "Impact",
};

export default function ProjectCard({
  project,
  variant = "default",
}: {
  project: ProjectCardData;
  variant?: "default" | "sandbox";
}) {
  const primarySdg = project.sdgGoals[0];
  const tint = variant === "sandbox" ? "#f59e0b" : primarySdg ? SDG_COLORS[primarySdg] : "#43aa8b";
  const stageLabel = project.archivedAt ? "Avslutat" : PHASE_LABEL_SV[project.phase] ?? project.phase;

  return (
    <a
      href={`/projects/${project.slug}`}
      className={`rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col ${
        variant === "sandbox" ? "border-2 border-amber-300 hover:border-amber-400" : "border border-muted-teal/40"
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
          title={isCommercialLegalType(project.legalType) ? "Kommersiellt projekt" : "Ideellt projekt"}
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
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{project.title}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          av <span className="text-coral">{project.owner.name ?? "Okänd"}</span>
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
          {project.summary ?? project.description ?? "Ingen beskrivning ännu."}
        </p>
        {project.sdgGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] font-bold text-dark-slate/40 mr-0.5">Agenda 2030:</span>
            {project.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.members.length}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Medlemmar</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">
              {project.kanbanCardsDone}/{project._count.kanbanCards}
            </p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Uppgifter</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{stageLabel}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Fas</p>
          </div>
        </div>
      </div>
    </a>
  );
}
