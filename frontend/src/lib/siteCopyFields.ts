// Every static text field on the homepage and Drömfabriken that's editable
// via /site-admin/site-copy, grouped by the section an admin sees it in.
// `key` must be the exact next-intl message path so components can resolve
// `copy[key] ?? t(shortKey)` — see getSiteCopyMap in @/lib/siteCopy.
//
// NOT included here (already have their own dedicated editors, or aren't
// visible page content): HomePage.heroDefaultHeading/heroDefaultBody
// (site-admin/hero-carousel), SandboxPillars/the sandbox hero kicker+intro
// (site-admin/sandbox-hero), and any aria-label-only text.
export type SiteCopyField = { key: string; label: string; multiline?: boolean };
export type SiteCopySection = { title: string; fields: SiteCopyField[] };

export const SITE_COPY_SECTIONS: SiteCopySection[] = [
  {
    title: "Hero — knappar och etikett",
    fields: [
      { key: "HomePage.heroEyebrow", label: "Kicker (ovanför rubriken)" },
      { key: "HomePage.heroCtaPrimary", label: "Primär knapp" },
      { key: "HomePage.heroCtaSecondary", label: "Sekundär knapp" },
      { key: "HomePage.heroEditLink", label: "\"Redigera\"-länk (endast admin)" },
    ],
  },
  {
    title: "Vision · Mission · Mål",
    fields: [
      { key: "HomePage.visionMissionGoal.visionLabel", label: "Vision — etikett" },
      { key: "HomePage.visionMissionGoal.visionBody", label: "Vision — text", multiline: true },
      { key: "HomePage.visionMissionGoal.missionLabel", label: "Mission — etikett" },
      { key: "HomePage.visionMissionGoal.missionBody", label: "Mission — text", multiline: true },
      { key: "HomePage.visionMissionGoal.goalLabel", label: "Mål — etikett" },
      { key: "HomePage.visionMissionGoal.goalBody", label: "Mål — text", multiline: true },
      { key: "HomePage.visionMissionGoal.foundationNote", label: "Fotnot om stiftelsen", multiline: true },
    ],
  },
  {
    title: "Fem steg",
    fields: [
      { key: "Showroom.stepsCarousel.eyebrow", label: "Kicker" },
      { key: "Showroom.stepsCarousel.heading", label: "Rubrik" },
      { key: "Showroom.stepsCarousel.step0Label", label: "Steg 1 — etikett" },
      { key: "Showroom.stepsCarousel.step0Title", label: "Steg 1 — titel" },
      { key: "Showroom.stepsCarousel.step0Body", label: "Steg 1 — text", multiline: true },
      { key: "Showroom.stepsCarousel.step1Label", label: "Steg 2 — etikett" },
      { key: "Showroom.stepsCarousel.step1Title", label: "Steg 2 — titel" },
      { key: "Showroom.stepsCarousel.step1Body", label: "Steg 2 — text", multiline: true },
      { key: "Showroom.stepsCarousel.step2Label", label: "Steg 3 — etikett" },
      { key: "Showroom.stepsCarousel.step2Title", label: "Steg 3 — titel" },
      { key: "Showroom.stepsCarousel.step2Body", label: "Steg 3 — text", multiline: true },
      { key: "Showroom.stepsCarousel.step3Label", label: "Steg 4 — etikett" },
      { key: "Showroom.stepsCarousel.step3Title", label: "Steg 4 — titel" },
      { key: "Showroom.stepsCarousel.step3Body", label: "Steg 4 — text", multiline: true },
      { key: "Showroom.stepsCarousel.step4Label", label: "Steg 5 — etikett" },
      { key: "Showroom.stepsCarousel.step4Title", label: "Steg 5 — titel" },
      { key: "Showroom.stepsCarousel.step4Body", label: "Steg 5 — text", multiline: true },
    ],
  },
  {
    title: "Idé-bandet",
    fields: [
      { key: "Showroom.ideaBand.heading", label: "Rubrik" },
      { key: "Showroom.ideaBand.placeholder", label: "Platshållartext i fältet" },
      { key: "Showroom.ideaBand.cta", label: "Knapp" },
    ],
  },
  {
    title: "Var i resan projekten befinner sig",
    fields: [
      { key: "HomePage.phaseMap.eyebrow", label: "Kicker" },
      { key: "HomePage.phaseMap.heading", label: "Rubrik" },
    ],
  },
  {
    title: "Så används plattformen just nu",
    fields: [
      { key: "HomePage.usageNow.eyebrow", label: "Kicker" },
      { key: "HomePage.usageNow.heading", label: "Rubrik" },
    ],
  },
  {
    title: "Projektlistan",
    fields: [
      { key: "HomePage.exploreProjectsHeading", label: "Rubrik" },
      { key: "HomePage.seeAllProjectsLink", label: "\"Se alla projekt\"-länk" },
      { key: "HomePage.noProjectsMatchFilters", label: "Text när inga projekt matchar filter" },
      { key: "HomePage.clearFiltersLink", label: "\"Rensa filter\"-länk" },
    ],
  },
  {
    title: "Verktygen — sektion",
    fields: [
      { key: "HomePage.tools.eyebrow", label: "Kicker" },
      { key: "HomePage.tools.heading", label: "Rubrik" },
      { key: "HomePage.tools.intro", label: "Ingress", multiline: true },
      { key: "HomePage.tools.cta", label: "Knapp" },
      { key: "HomePage.tools.reassurance", label: "Text under knappen" },
    ],
  },
  {
    title: "Verktygen — enskilda kort",
    fields: [
      { key: "HomePage.tools.leanCanvasLabel", label: "Lean Canvas — titel" },
      { key: "HomePage.tools.leanCanvasBody", label: "Lean Canvas — text", multiline: true },
      { key: "HomePage.tools.valuePropositionLabel", label: "Värdeerbjudande — titel" },
      { key: "HomePage.tools.valuePropositionBody", label: "Värdeerbjudande — text", multiline: true },
      { key: "HomePage.tools.whiteboardLabel", label: "Whiteboard — titel" },
      { key: "HomePage.tools.whiteboardBody", label: "Whiteboard — text", multiline: true },
      { key: "HomePage.tools.kanbanLabel", label: "Kanban-board — titel" },
      { key: "HomePage.tools.kanbanBody", label: "Kanban-board — text", multiline: true },
      { key: "HomePage.tools.fundingLabel", label: "Crowdfunding — titel" },
      { key: "HomePage.tools.fundingBody", label: "Crowdfunding — text", multiline: true },
      { key: "HomePage.tools.pollsLabel", label: "Omröstningar — titel" },
      { key: "HomePage.tools.pollsBody", label: "Omröstningar — text", multiline: true },
      { key: "HomePage.tools.tokensLabel", label: "Belöningar — titel" },
      { key: "HomePage.tools.tokensBody", label: "Belöningar — text", multiline: true },
      { key: "HomePage.tools.sprintsLabel", label: "Sprints — titel" },
      { key: "HomePage.tools.sprintsBody", label: "Sprints — text", multiline: true },
      { key: "HomePage.tools.ideaSessionsLabel", label: "Idégenerering — titel" },
      { key: "HomePage.tools.ideaSessionsBody", label: "Idégenerering — text", multiline: true },
      { key: "HomePage.tools.blogLabel", label: "Blogg — titel" },
      { key: "HomePage.tools.blogBody", label: "Blogg — text", multiline: true },
      { key: "HomePage.tools.wikiLabel", label: "Wiki — titel" },
      { key: "HomePage.tools.wikiBody", label: "Wiki — text", multiline: true },
      { key: "HomePage.tools.kanalerLabel", label: "Chatt — titel" },
      { key: "HomePage.tools.kanalerBody", label: "Chatt — text", multiline: true },
      { key: "HomePage.tools.calendarLabel", label: "Kalender — titel" },
      { key: "HomePage.tools.calendarBody", label: "Kalender — text", multiline: true },
      { key: "HomePage.tools.filesLabel", label: "Filarea — titel" },
      { key: "HomePage.tools.filesBody", label: "Filarea — text", multiline: true },
      { key: "HomePage.tools.ganttLabel", label: "Gantt-schema — titel" },
      { key: "HomePage.tools.ganttBody", label: "Gantt-schema — text", multiline: true },
      { key: "HomePage.tools.todosLabel", label: "Todo-listor — titel" },
      { key: "HomePage.tools.todosBody", label: "Todo-listor — text", multiline: true },
    ],
  },
  {
    title: "Drömfabriken — projekt",
    fields: [
      { key: "SandboxPage.exploreHeading", label: "Rubrik" },
      { key: "SandboxPage.emptyProjects", label: "Text när inga projekt finns" },
      { key: "SandboxPage.startFirstProject", label: "\"Starta det första\"-länk" },
      { key: "SandboxPage.startNext", label: "\"Starta nästa\"-länk" },
      { key: "SandboxPage.aiSeedingSoon", label: "AI-seedning-notis" },
    ],
  },
  {
    title: "Drömfabriken — idéer",
    fields: [
      { key: "SandboxPage.exploreIdeasHeading", label: "Rubrik" },
      { key: "SandboxPage.seeAllIdeasLink", label: "\"Se alla idéer\"-länk" },
      { key: "SandboxPage.noIdeasYet", label: "Text när inga idéer finns" },
      { key: "SandboxPage.shareFirstIdeaLink", label: "\"Dela den första idén\"-länk" },
    ],
  },
  {
    title: "Drömfabriken — Lean Canvas & Whiteboard & Värdeerbjudande",
    fields: [
      { key: "SandboxPage.exploreLeanCanvasHeading", label: "Lean Canvas — rubrik" },
      { key: "SandboxPage.seeAllLeanCanvasLink", label: "Lean Canvas — \"Se alla\"-länk" },
      { key: "SandboxPage.exploreWhiteboardHeading", label: "Whiteboard — rubrik" },
      { key: "SandboxPage.seeAllWhiteboardLink", label: "Whiteboard — \"Se alla\"-länk" },
      { key: "SandboxPage.exploreValuePropositionHeading", label: "Värdeerbjudande — rubrik" },
      { key: "SandboxPage.seeAllValuePropositionLink", label: "Värdeerbjudande — \"Se alla\"-länk" },
    ],
  },
  {
    title: "Drömfabriken — aktivitetsflöde",
    fields: [
      { key: "SandboxPage.pulseHeading", label: "Rubrik" },
      { key: "SandboxPage.pulseSubheading", label: "Underrubrik" },
      { key: "SandboxPage.seeAllPulseLink", label: "\"Se all aktivitet\"-länk" },
    ],
  },
];

export const SITE_COPY_KEYS: string[] = SITE_COPY_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
