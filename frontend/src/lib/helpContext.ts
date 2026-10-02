// What the help panel (components/HelpPanel.tsx) shows for the page you're
// on: the page's own help text, which guides come first and, inside a
// project, the phase the page belongs to. Pure — the phase and next step
// come from /api/projects/[slug]/help.

// A project page's first path segment → the namespace whose `helpText`
// explains it. These are the same texts the pages' own "?" buttons show
// (WorkspacePageHeader / HelpButton), so there's one text per page to keep
// up to date.
export const PROJECT_PAGE_HELP: Record<string, string> = {
  tasks: "TasksPage",
  kanban: "TasksPage",
  "lean-canvas": "LeanCanvasPage",
  "customer-model": "CustomerModelPage",
  "impact-model": "ImpactModelPage",
  "value-proposition": "ValuePropositionPage",
  interviews: "InterviewLogPage",
  "market-scan": "MarketScanPage",
  "idea-sessions": "IdeaSessionsPage",
  "project-plan": "ProjectPlanPage",
  sprints: "SprintsPage",
  "launch-plan": "LaunchPlanPage",
  scale: "ScalePage",
  impact: "ImpactPage",
  members: "MembersManager",
  wiki: "WikiPageDetail",
  calendar: "CalendarPage",
  files: "FilesPage",
  polls: "PollsPage",
  tokens: "TokensPage",
  "profit-distribution": "ProfitDistributionPage",
  "legal-type": "LegalTypePage",
  funding: "FundingPage",
  partnerships: "PartnershipsPage",
  roadmap: "RoadmapPage",
  alumni: "AlumniPage",
  updates: "UpdatesPage",
  "ai-review": "AIReviewPage",
  edit: "EditProjectPage",
};

// Pages one level deeper with their own text.
const NESTED_PAGE_HELP: Record<string, string> = {
  "funding/recurring": "RecurringFundingPage",
};

export type HelpContext = {
  // Set inside a project (not /projects/new).
  projectSlug: string | null;
  // Namespace whose `helpText` describes this page, if it has one.
  pageHelp: string | null;
};

// `path` without locale (next-intl's usePathname).
export function helpContextFor(path: string): HelpContext {
  const m = path.match(/^\/projects\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?/);
  if (!m || m[1] === "new") return { projectSlug: null, pageHelp: null };
  const [, slug, first, second] = m;
  const pageHelp = (first && second && NESTED_PAGE_HELP[`${first}/${second}`]) || (first && PROJECT_PAGE_HELP[first]) || null;
  return { projectSlug: slug, pageHelp };
}

// The general guides, in the order shown when nothing on the page says
// otherwise. A guide that belongs to the page you're on moves to the top.
export const GUIDES = [
  { key: "gettingStarted", href: "/about" },
  { key: "startProject", href: "/projects/new" },
  { key: "findProject", href: "/projects" },
  { key: "myGoodTribes", href: "/my-goodtribes" },
  { key: "academy", href: "/academy" },
  { key: "codeOfConduct", href: "/code-of-conduct" },
] as const;

export type GuideKey = (typeof GUIDES)[number]["key"];

// Which guide is "about" a given page (prefix match on the path).
const GUIDE_FOR_PATH: [prefix: string, guide: GuideKey][] = [
  ["/projects/new", "startProject"],
  ["/projects", "findProject"],
  ["/dashboard", "findProject"],
  ["/my-goodtribes", "myGoodTribes"],
  ["/workplace", "myGoodTribes"],
  ["/academy", "academy"],
  ["/code-of-conduct", "codeOfConduct"],
  ["/about", "gettingStarted"],
];

export function orderedGuides(path: string, inProject: boolean) {
  // Inside a project the project's own help comes first; the general guides
  // keep their order (finding a project isn't what you're doing there).
  const match = inProject ? undefined : GUIDE_FOR_PATH.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1];
  // On the start page and for anyone just looking around: getting started first (already first).
  if (!match) return [...GUIDES];
  return [...GUIDES.filter((g) => g.key === match), ...GUIDES.filter((g) => g.key !== match)];
}
