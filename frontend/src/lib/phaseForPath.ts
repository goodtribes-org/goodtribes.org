import { toDisplayPhase, type ProjectPhaseValue } from "@/lib/projectPhase";

type DisplayPhase = Exclude<ProjectPhaseValue, "SPRINT">;

// Which phase a project page belongs to, so the header can show the phase
// the user is working in as active — not only the project's own phase.
// Only pages that belong to exactly one phase count: the phase tools (the
// same ones the project menu tags with a phase), the phase overviews and the
// phase guides. General tools used across phases (members, kanban, wiki,
// funding, …) belong to none; there the project's own phase stays active.
const PHASE_PAGES: Record<DisplayPhase, string[]> = {
  IDEA: ["ide", "idea-sessions", "lean-canvas", "customer-model", "impact-model", "value-proposition", "interviews", "market-scan"],
  PILOT: ["uppstart", "project-plan", "sprints"],
  PRODUCTION: ["lansering", "pilot-evaluation", "launch-plan"],
  ESTABLISH: ["etablera", "establishment-plan", "review-request"],
  SCALE: ["skala", "scaling-plan", "scale"],
  IMPACT: ["impactfasen", "impact-followup"],
};

// /guide is the Idé guide; /guide/<phase> the others (lower-case enum value).
const GUIDE_PHASES: Record<string, DisplayPhase> = {
  pilot: "PILOT",
  production: "PRODUCTION",
  establish: "ESTABLISH",
  scale: "SCALE",
  impact: "IMPACT",
};

// `path` without locale (next-intl's usePathname), e.g. /projects/x/sprints/abc.
export function phaseForProjectPath(path: string, slug: string): DisplayPhase | null {
  const base = `/projects/${slug}/`;
  if (!path.startsWith(base)) return null;
  const [first, second] = path.slice(base.length).split("/");
  if (first === "guide") return second ? (GUIDE_PHASES[second] ?? null) : "IDEA";
  for (const [phase, pages] of Object.entries(PHASE_PAGES) as [DisplayPhase, string[]][]) {
    if (pages.includes(first)) return phase;
  }
  return null;
}

// The phase to show as active in the header: the one the page belongs to,
// or else the project's own phase.
export function activePhaseFor(path: string, slug: string, projectPhase: ProjectPhaseValue): DisplayPhase {
  return phaseForProjectPath(path, slug) ?? toDisplayPhase(projectPhase);
}
