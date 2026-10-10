import { plainText } from "@/lib/shareCard";

// "Skriv själv" (#311): the two phase documents that live in the wiki —
// Lansering's "Arbetsflöden och ansvar" and Etablera's playbook — could only
// be made by the AI fill. A lead without AI now starts one from a template.
// A page that is still the untouched template doesn't count as written: the
// phase step's automatic tick and the gate's criterion wait for real text.

export const PHASE_WIKI_SLUGS = ["arbetsfloden", "playbook"] as const;
export type PhaseWikiSlug = (typeof PHASE_WIKI_SLUGS)[number];
type Lang = "sv" | "en";

const section = (heading: string, hint: string) => `<h2>${heading}</h2><p><em>${hint}</em></p>`;

const TEMPLATES: Record<PhaseWikiSlug, Record<Lang, { title: string; html: string }>> = {
  arbetsfloden: {
    sv: {
      title: "Arbetsflöden och ansvar",
      html: [
        section("Arbetsflödet steg för steg", "Vad händer, i vilken ordning, från första kontakt till att det är klart?"),
        section("Vem ansvarar för vad", "En rad per roll: vad den personen gör och bestämmer."),
        section("Återkommande rutiner", "Det som görs varje vecka eller månad, och vem som gör det."),
      ].join(""),
    },
    en: {
      title: "Workflows and responsibilities",
      html: [
        section("The workflow step by step", "What happens, in what order, from first contact to done?"),
        section("Who is responsible for what", "One line per role: what that person does and decides."),
        section("Recurring routines", "What is done every week or month, and who does it."),
      ].join(""),
    },
  },
  playbook: {
    sv: {
      title: "Playbook",
      html: [
        section("Förutsättningar", "Vad behöver finnas på plats innan någon kan starta samma sak?"),
        section("Steg för steg", "Hur startar man, från första veckan till stabil drift?"),
        section("Roller", "Vilka roller behövs och vad gör de?"),
        section("Rutiner", "Det som behöver göras regelbundet för att det ska fungera."),
        section("Lärdomar", "Det ni hade velat veta från början."),
      ].join(""),
    },
    en: {
      title: "Playbook",
      html: [
        section("Prerequisites", "What needs to be in place before someone can start the same thing?"),
        section("Step by step", "How do you start, from the first week to stable operations?"),
        section("Roles", "Which roles are needed and what do they do?"),
        section("Routines", "What needs doing regularly for it to work."),
        section("Lessons", "What you wish you had known from the start."),
      ].join(""),
    },
  },
};

export function isPhaseWikiSlug(slug: string): slug is PhaseWikiSlug {
  return (PHASE_WIKI_SLUGS as readonly string[]).includes(slug);
}

export function phaseWikiTemplate(slug: PhaseWikiSlug, locale: string): { title: string; html: string } {
  return TEMPLATES[slug][locale === "en" ? "en" : "sv"];
}

const squash = (html: string) => plainText(html).replace(/\s+/g, "");

// Written = has text, and isn't just one of this page's templates.
export function isWrittenPhaseWiki(slug: string, html: string | null | undefined): boolean {
  if (!html || !squash(html)) return false;
  if (!isPhaseWikiSlug(slug)) return true;
  const text = squash(html);
  return !Object.values(TEMPLATES[slug]).some((t) => squash(t.html) === text);
}
