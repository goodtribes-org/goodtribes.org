export const LEAN_CANVAS_FIELDS = [
  "problem",
  "alternatives",
  "customerSegments",
  "earlyAdopters",
  "uniqueValueProposition",
  "concept",
  "solution",
  "channels",
  "revenueStreams",
  "costStructure",
  "impact",
  "keyMetrics",
  "unfairAdvantage",
] as const;

export type LeanCanvasField = (typeof LEAN_CANVAS_FIELDS)[number];

export const LEAN_CANVAS_BLOCKS: { field: LeanCanvasField; area: string; label: string; hint: string }[] = [
  { field: "problem", area: "problem", label: "Problem", hint: "Topp 3 problem värda att lösa" },
  { field: "alternatives", area: "alt", label: "Alternativ", hint: "Hur löser man problemet idag" },
  { field: "solution", area: "solution", label: "Lösning", hint: "Möjliga lösningar på problemen ovan" },
  { field: "keyMetrics", area: "metrics", label: "Nyckeltal", hint: "Hur ni mäter att det fungerar" },
  { field: "uniqueValueProposition", area: "uvp", label: "Unikt värdeerbjudande", hint: "Ett tydligt budskap som gör er annorlunda" },
  { field: "concept", area: "concept", label: "Koncept", hint: "Vad är pitchen" },
  { field: "unfairAdvantage", area: "unfair", label: "Orättvis fördel", hint: "Något som inte lätt kan kopieras eller köpas" },
  { field: "channels", area: "channels", label: "Kanaler", hint: "Vägar till era kunder" },
  { field: "customerSegments", area: "segments", label: "Kundsegment", hint: "Målgrupper och early adopters" },
  { field: "earlyAdopters", area: "early", label: "Tidiga användare", hint: "Vem kommer först att börja använda lösningen" },
  { field: "costStructure", area: "cost", label: "Kostnadsstruktur", hint: "De viktigaste kostnaderna" },
  { field: "impact", area: "impact", label: "Impact", hint: "Varför, Hur och Vad" },
  { field: "revenueStreams", area: "revenue", label: "Intäktsströmmar", hint: "Hur ni tjänar pengar" },
];
